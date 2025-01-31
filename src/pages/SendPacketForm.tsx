import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const packetSchema = z.object({
  senderId: z.number().min(1, "Sender ID obbligatorio"),
  sessionId: z.number().min(1, "Session ID obbligatorio"),
  packetType: z.enum(["MsgFragment", "Ack", "Nack", "FloodRequest", "FloodResponse"]),
  hops: z.string().refine((value) => value.split(",").every((id) => !isNaN(Number(id))), {
    message: "Inserisci una lista di nodi separata da virgola (es. 1,2,3)",
  }),
  fragmentIndex: z.number().optional(),
  totalFragments: z.number().optional(),
  data: z.string().optional(),
});

export default function SendPacketForm() {
  const [packetType, setPacketType] = useState<"MsgFragment" | "Ack" | "Nack" | "FloodRequest" | "FloodResponse">(
    "MsgFragment"
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(packetSchema),
    defaultValues: {
      senderId: "",
      sessionId: "",
      packetType: "MsgFragment",
      hops: "",
      fragmentIndex: undefined,
      totalFragments: undefined,
      data: "",
    },
  });

  // 📤 Invio Pacchetto a Tauri
  const onSubmit = async (data: any) => {
    try {
      const hopsArray = data.hops.split(",").map((id: string) => Number(id.trim()));

      await invoke("send_packet", {
        sender_id: Number(data.senderId),
        session_id: Number(data.sessionId),
        hops: hopsArray,
        hop_index: 0,
        fragment_index: data.fragmentIndex ?? 0,
        total_fragments: data.totalFragments ?? 1,
        data: data.data ?? "",
      });

      toast.success("Pacchetto inviato con successo!");
    } catch (error) {
      toast.error(`Errore nell'invio: ${ error }`);
    }
  };

  return (
    <div className="p-6 border border-gray-300 rounded-lg shadow-md bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">📦 Invia un Pacchetto</h2>

      <form onSubmit={ handleSubmit(onSubmit) } className="space-y-4">
        {/* Sender ID */ }
        <div>
          <label className="text-sm font-medium">Sender ID</label>
          <Input type="number" { ...register("senderId") } className="mt-1"/>
          { errors.senderId && <p className="text-red-500 text-xs">{ errors.senderId.message }</p> }
        </div>

        {/* Session ID */ }
        <div>
          <label className="text-sm font-medium">Session ID</label>
          <Input type="number" { ...register("sessionId") } className="mt-1"/>
          { errors.sessionId && <p className="text-red-500 text-xs">{ errors.sessionId.message }</p> }
        </div>

        {/* Packet Type */ }
        <div>
          <label className="text-sm font-medium">Tipo di Pacchetto</label>
          <Controller
            control={ control }
            name="packetType"
            render={ ({ field }) => (
              <Select value={ field.value } onValueChange={ (val) => {
                field.onChange(val);
                setPacketType(val as any);
              } }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il tipo"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MsgFragment">MsgFragment</SelectItem>
                  <SelectItem value="Ack">Ack</SelectItem>
                  <SelectItem value="Nack">Nack</SelectItem>
                  <SelectItem value="FloodRequest">FloodRequest</SelectItem>
                  <SelectItem value="FloodResponse">FloodResponse</SelectItem>
                </SelectContent>
              </Select>
            ) }
          />
          { errors.packetType && <p className="text-red-500 text-xs">{ errors.packetType.message }</p> }
        </div>

        {/* Hops */ }
        <div>
          <label className="text-sm font-medium">Percorso (Hops)</label>
          <Input type="text" { ...register("hops") } className="mt-1" placeholder="Esempio: 1,2,3,4"/>
          { errors.hops && <p className="text-red-500 text-xs">{ errors.hops.message }</p> }
        </div>

        {/* Fragment Index & Total Fragments (solo per MsgFragment) */ }
        { packetType === "MsgFragment" && (
          <>
            <div>
              <label className="text-sm font-medium">Fragment Index</label>
              <Input type="number" { ...register("fragmentIndex") } className="mt-1"/>
            </div>
            <div>
              <label className="text-sm font-medium">Total Fragments</label>
              <Input type="number" { ...register("totalFragments") } className="mt-1"/>
            </div>
          </>
        ) }

        {/* Data (solo per MsgFragment & FloodRequest) */ }
        { (packetType === "MsgFragment" || packetType === "FloodRequest") && (
          <div>
            <label className="text-sm font-medium">Dati</label>
            <Input type="text" { ...register("data") } className="mt-1" placeholder="Contenuto del pacchetto"/>
          </div>
        ) }

        {/* Pulsante di Invio */ }
        <Button type="submit" className="w-full mt-4 bg-blue-500 text-white">
          Invia Pacchetto
        </Button>
      </form>
    </div>
  );
}
