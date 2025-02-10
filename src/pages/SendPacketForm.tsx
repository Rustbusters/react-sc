import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useSimulation } from "@/components/SimulationContext.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { TriangleAlert } from "lucide-react";

// ─── ZOD SCHEMA ────────────────────────────────────────────────────────────────

const packetTypeEnum = ["MsgFragment", "Ack", "Nack", "FloodRequest", "FloodResponse"] as const;
const nackTypeEnum = ["Dropped", "DestinationIsDrone", "ErrorInRouting", "UnexpectedRecipient"] as const;

const packetSchema = z.object({
  senderId: z.coerce.number().min(1, "Sender ID is required"),
  sessionId: z.coerce.number().min(1, "Session ID is required"),
  packetType: z.enum(packetTypeEnum),
  hops: z.string().refine(
    (value) =>
      value.split(",").every((id) => !isNaN(Number(id.trim()))),
    { message: "Enter a comma‐separated list of nodes (e.g., 1,2,3)" }
  ),
  fragmentIndex: z.coerce.number().optional(),
  totalFragments: z.coerce.number().optional(),
  data: z.string().optional(),
  batchCount: z.coerce.number().min(1).optional(),
  interval: z.coerce.number().min(0).optional(),
  randomMode: z.boolean().optional(),
  nackType: z.string().optional(),
  errorNode: z.coerce.number().optional(),
});

// ─── TYPES ──────────────────────────────────────────────────────────────────────

type PacketData = z.infer<typeof packetSchema>;
type PacketType = typeof packetTypeEnum[number];

// ─── DEFAULT VALUES ────────────────────────────────────────────────────────────

const DEFAULT_VALUES = {
  senderId: 1,
  sessionId: 1,
  packetType: packetTypeEnum[0],
  hops: "",
  fragmentIndex: 0,
  totalFragments: 1,
  data: "",
  batchCount: 1,
  interval: 1000,
  randomMode: false,
  nackType: nackTypeEnum[0],
  errorNode: undefined,
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function SendPacketForm() {
  // Local state for progress and sending status
  const [progressData, setProgressData] = useState<{ sent: number; remaining: number }>({ sent: 0, remaining: 0 });
  const [isSending, setIsSending] = useState(false);
  // const [isRandomMode, setIsRandomMode] = useState(false);
  const { status } = useSimulation();


  const form = useForm<PacketData>({
    resolver: zodResolver(packetSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // ─── LOCAL STORAGE ───────────────────────────────────────────────────────────
  const updateLocalStorage = (sent: number, remaining: number) => {
    localStorage.setItem("packet-progress", JSON.stringify({ sent, remaining }));
  };

  // ─── SEND PACKET ─────────────────────────────────────────────────────────────
  const sendPacket = async (packet: any) => {
    await invoke("send_packet", packet); // TODO: review this
  };

  // For a single packet we convert the hops from a comma-separated string to an array.
  const handleSinglePacket = async (data: PacketData, hopsArray: number[]) => {
    await sendPacket({
      senderId: Number(data.senderId),
      sessionId: Number(data.sessionId),
      packetType: data.packetType,
      hops: hopsArray,
      fragmentIndex: ["MsgFragment", "Ack", "Nack"].includes(data.packetType)
        ? data.fragmentIndex ?? 0
        : 0,
      totalFragments:
        data.packetType === "MsgFragment" ? (data.totalFragments ?? 1) : 0,
      data: ["MsgFragment", "FloodRequest", "FloodResponse"].includes(data.packetType)
        ? data.data ?? ""
        : "",
      nackType: data.packetType === "Nack" ? data.nackType : undefined,
      errorNode:
        data.packetType === "Nack" && data.errorNode
          ? Number(data.errorNode)
          : undefined,
    });
    toast.success("Packet sent successfully!");
  };

  // ─── NEW: Start Repeated Sending ─────────────────────────────────────────────
  // When batchCount > 1 or randomMode is true, we call the background command.
  const startRepeatedSending = async (data: PacketData, hopsArray: number[]) => {
    try {
      // Set sending state so that the progress bar and Stop button appear.
      setIsSending(true);
      // Invoke the backend command
      await invoke("start_repeated_sending", {
        senderId: Number(data.senderId),
        sessionId: Number(data.sessionId),
        packetType: data.packetType,
        hops: hopsArray,
        fragmentIndex: data.fragmentIndex,
        totalFragments: data.totalFragments,
        data: data.data,
        nackType: data.packetType === "Nack" ? data.nackType : undefined,
        errorNode:
          data.packetType === "Nack" && data.errorNode
            ? Number(data.errorNode)
            : undefined,
        batchCount: data.batchCount,
        interval: data.interval,
        randomMode: data.randomMode,
      });

      toast.loading("Sending packets…" + (data.batchCount ? ` (${ data.batchCount } packets)` : ""));

      // toast.success("Repeated sending started");
    } catch (error) {
      toast.error(`Error starting repeated sending: ${ error }`);
      setIsSending(false);
    }
  };

  // ─── Handler to Stop Repeated Sending ───────────────────────────────────────
  const handleStop = async () => {
    try {
      await invoke("stop_repeated_sending");
      toast.success("Repeated sending stopped");
      setIsSending(false);
    } catch (error) {
      toast.error(`Error stopping repeated sending: ${ error }`);
    }
  };
  // Error sending packet: Command send_packet not found

  // ─── SUBMIT HANDLER ─────────────────────────────────────────────────────────
  const onSubmit = async (data: PacketData) => {
    try {
      const hopsArray = data.hops.split(",").map((id: string) => Number(id.trim()));
      // If batch sending or random mode is requested, use repeated sending:
      console.log(data);
      if (data.randomMode || (data.batchCount && data.batchCount > 1)) {
        console.log("Starting repeated sending");
        await startRepeatedSending(data, hopsArray);
      } else {
        await handleSinglePacket(data, hopsArray);
      }
    } catch (error) {
      toast.error(`Error sending packet: ${ error }`);
    } finally {
      form.reset(DEFAULT_VALUES);
    }
  };

  // ─── Event Listeners for Progress Updates ───────────────────────────────────
  useEffect(() => {
    const unlistenStatus = listen("packet-sending-status", (event: any) => {
      // Expect event.payload = { sent: number, remaining: number }
      const { sent, remaining } = event.payload;
      setProgressData({ sent, remaining });
      updateLocalStorage(sent, remaining);
    });
    const unlistenComplete = listen("packet-sending-complete", (event: any) => {
      console.log("Sending complete:", event.payload);
      setIsSending(false);
      setProgressData({ sent: event.payload.sent, remaining: 0 });
      toast.dismiss();
      localStorage.removeItem("packet-progress");
    });
    return () => {
      unlistenStatus.then((f) => f());
      unlistenComplete.then((f) => f());
    };
  }, []);

  // ─── Compute progress percentage (if total > 0) ─────────────────────────────
  const total = progressData.sent + progressData.remaining;
  const percent = total > 0 ? Math.round((progressData.sent / total) * 100) : 0;


  // ─── On Mount ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedProgress = localStorage.getItem("packet-progress");
    if (savedProgress) {
      const { sent, remaining } = JSON.parse(savedProgress);
      setProgressData({ sent, remaining });
      setIsSending(remaining > 0);
      if (!isSending) {
        toast.dismiss();
      }
    } else {
      toast.dismiss();
    }
  }, []);

  // ─── RENDER THE FORM ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 rounded-lg w-full mx-auto max-w-3xl select-none">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        📦 Send a Packet
      </h2>
      <Form { ...form }>
        <form onSubmit={ form.handleSubmit(onSubmit) } className="space-y-6">
          {/* Main Fields */ }
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={ form.control }
              name="senderId"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Sender ID</FormLabel>
                  <FormControl>
                    <Input type="number" { ...field } />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
            <FormField
              control={ form.control }
              name="sessionId"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Session ID</FormLabel>
                  <FormControl>
                    <Input type="number" { ...field } />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
            <FormField
              control={ form.control }
              name="packetType"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Packet Type</FormLabel>
                  <Select onValueChange={ field.onChange } defaultValue={ field.value as PacketType }>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      { packetTypeEnum.map((type) => (
                        <SelectItem key={ type } value={ type }>
                          { type }
                        </SelectItem>
                      )) }
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              ) }
            />
          </div>
          <FormField
            control={ form.control }
            name="hops"
            render={ ({ field }) => (
              <FormItem>
                <FormLabel>Path (Hops)</FormLabel>
                <FormControl>
                  <Input type="text" { ...field } placeholder="Example: 1,2,3,4"/>
                </FormControl>
                <FormMessage/>
              </FormItem>
            ) }
          />

          {/* For MsgFragment, Ack, and Nack: show a fragment index;
              if MsgFragment, also show total fragments */ }
          { ["MsgFragment", "Ack", "Nack"].includes(form.watch("packetType")) && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={ form.control }
                name="fragmentIndex"
                render={ ({ field }) => (
                  <FormItem>
                    <FormLabel>Fragment Index</FormLabel>
                    <FormControl>
                      <Input type="number" { ...field } />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                ) }
              />
              { form.watch("packetType") === "MsgFragment" && (
                <FormField
                  control={ form.control }
                  name="totalFragments"
                  render={ ({ field }) => (
                    <FormItem>
                      <FormLabel>Total Fragments</FormLabel>
                      <FormControl>
                        <Input type="number" { ...field } />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  ) }
                />
              ) }
            </div>
          ) }

          {/* For packets that include content */ }
          { ["MsgFragment", "FloodRequest", "FloodResponse"].includes(form.watch("packetType")) && (
            <FormField
              control={ form.control }
              name="data"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="text" { ...field } placeholder="Packet content"/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
          ) }

          {/* For Nack: show the nack type and, when needed, an error node id */ }
          { form.watch("packetType") === "Nack" && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={ form.control }
                name="nackType"
                render={ ({ field }) => (
                  <FormItem>
                    <FormLabel>Nack Type</FormLabel>
                    <Select onValueChange={ field.onChange } defaultValue={ field.value }>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Nack Type"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        { nackTypeEnum.map((type) => (
                          <SelectItem key={ type } value={ type }>
                            { type }
                          </SelectItem>
                        )) }
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                ) }
              />
              { ["ErrorInRouting", "UnexpectedRecipient"].includes(form.watch("nackType") as string) && (
                <FormField
                  control={ form.control }
                  name="errorNode"
                  render={ ({ field }) => (
                    <FormItem>
                      <FormLabel>Error Node ID</FormLabel>
                      <FormControl>
                        <Input type="number" { ...field } />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  ) }
                />
              ) }
            </div>
          ) }

          {/* Batch Count & Interval */ }
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={ form.control }
              name="batchCount"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Packet Count</FormLabel>
                  <FormControl>
                    <Input type="number" { ...field } />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
            <FormField
              control={ form.control }
              name="interval"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Interval (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" { ...field } />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
          </div>

          {/* Random Mode switch */ }
          {/*<FormField
            control={ form.control }
            name="randomMode"
            render={ ({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-4">
                  <FormLabel className="cursor-pointer">Random Mode</FormLabel>
                  <FormControl>
                    <Switch
                      checked={ isRandomMode }
                      onCheckedChange={ (checked) => {
                        setIsRandomMode(checked);
                        field.onChange(checked);
                      } }
                      className="mt-0"
                    />
                  </FormControl>
                </div>
              </FormItem>
            ) }
          />*/ }

          {/* Submit Button */ }
          <div className="flex justify-center gap-4">
            <Button type="submit" disabled={ isSending || status !== "Running" }>
              { isSending ? "Sending…" : "Send Packet" }
            </Button>
            {/* Show Stop button if a job is in progress */ }
            { isSending && (
              <Button variant="destructive" onClick={ handleStop }>
                Stop
              </Button>
            ) }
          </div>
        </form>
      </Form>

      {/* Progress Bar: display only when sending */ }
      { isSending && (
        <div className="mt-6">
          <div className="mb-2 text-sm">
            Progress: { progressData.sent } sent out of { progressData.sent + progressData.remaining } (
            { percent }%)
          </div>
          <Progress value={ percent } max={ 100 }/>
        </div>
      ) }

      <Alert className="mt-10">
        <TriangleAlert className="h-4 w-4"/>
        <AlertTitle>Warning!</AlertTitle>
        <AlertDescription>
          You might send a packet to nodes that are not expecting it, potentially causing unintended behavior and making
          the program panic.
          Proceed with caution.
        </AlertDescription>
      </Alert>

    </div>
  );
}
