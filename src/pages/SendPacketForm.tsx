import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { useSimulation } from "@/components/SimulationContext.tsx";

// ─── ZOD SCHEMA ────────────────────────────────────────────────────────────────

const packetTypeEnum = [
  "MsgFragment",
  "Ack",
  "Nack",
  "FloodRequest",
  "FloodResponse",
] as const;
const nackTypeEnum = [
  "Dropped",
  "DestinationIsDrone",
  "ErrorInRouting",
  "UnexpectedRecipient",
] as const;

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
  nackType: z.string().optional(),
  errorNode: z.coerce.number().optional(),
});

// ─── TYPES ──────────────────────────────────────────────────────────────────────

type PacketData = z.infer<typeof packetSchema>;
type PacketType = typeof packetTypeEnum[number];

// ─── DEFAULT VALUES ────────────────────────────────────────────────────────────

const DEFAULT_VALUES: PacketData = {
  senderId: 1,
  sessionId: 1,
  packetType: packetTypeEnum[0],
  hops: "",
  fragmentIndex: 0,
  totalFragments: 1,
  data: "",
  nackType: nackTypeEnum[0],
  errorNode: undefined,
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function SendPacketForm() {
  // For a single packet, we don't need progress state.
  const { status } = useSimulation();

  const form = useForm<PacketData>({
    resolver: zodResolver(packetSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // ─── SEND PACKET ─────────────────────────────────────────────────────────────
  const sendPacket = async (packet: any) => {
    await invoke("send_packet", packet);
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
      data: ["MsgFragment", "FloodRequest", "FloodResponse"].includes(
        data.packetType
      )
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

  // ─── SUBMIT HANDLER ─────────────────────────────────────────────────────────
  const onSubmit = async (data: PacketData) => {
    try {
      const hopsArray = data.hops
        .split(",")
        .map((id: string) => Number(id.trim()));
      await handleSinglePacket(data, hopsArray);
    } catch (error) {
      toast.error(`Error sending packet: ${ error }`);
    } finally {
      form.reset(DEFAULT_VALUES);
    }
  };

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
                  <Select
                    onValueChange={ field.onChange }
                    defaultValue={ field.value as PacketType }
                  >
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
                  <Input
                    type="text"
                    { ...field }
                    placeholder="Example: 1,2,3,4"
                  />
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
          { ["MsgFragment", "FloodRequest", "FloodResponse"].includes(
            form.watch("packetType")
          ) && (
            <FormField
              control={ form.control }
              name="data"
              render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      { ...field }
                      placeholder="Packet content"
                    />
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
              { ["ErrorInRouting", "UnexpectedRecipient"].includes(
                form.watch("nackType") as string
              ) && (
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
          {/* Submit Button */ }
          <div className="flex justify-center gap-4">
            <Button type="submit" disabled={ status !== "Running" }>
              Send Packet
            </Button>
          </div>
        </form>
      </Form>
      <Alert className="mt-10">
        <TriangleAlert className="h-4 w-4"/>
        <AlertTitle>Warning!</AlertTitle>
        <AlertDescription>
          You might send a packet to nodes that are not expecting it, potentially causing unintended behavior and making
          the program panic. Proceed with caution.
        </AlertDescription>
      </Alert>
    </div>
  );
}
