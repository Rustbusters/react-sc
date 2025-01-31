import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useState } from "react";
import { Switch } from "@/components/ui/switch.tsx";

// 📌 Schema di validazione con Zod
const packetSchema = z.object({
  senderId: z.coerce.number().min(1, "Sender ID obbligatorio"),
  sessionId: z.coerce.number().min(1, "Session ID obbligatorio"),
  packetType: z.enum(["MsgFragment", "Ack", "Nack", "FloodRequest", "FloodResponse"]),
  hops: z.string().refine(
    (value) => value.split(",").every((id) => !isNaN(Number(id.trim()))),
    { message: "Inserisci una lista di nodi separata da virgola (es. 1,2,3)" }
  ),
  fragmentIndex: z.coerce.number().optional(),
  totalFragments: z.coerce.number().optional(),
  data: z.string().optional(),
  batchCount: z.coerce.number().optional(),
  interval: z.coerce.number().optional(),
  randomMode: z.boolean().optional(),
});

export default function SendPacketForm() {
  const [isRandomMode, setIsRandomMode] = useState(false);
  const form = useForm({
    resolver: zodResolver(packetSchema),
    defaultValues: {
      senderId: "",
      sessionId: "",
      packetType: "MsgFragment",
      hops: "",
      fragmentIndex: undefined,
      totalFragments: undefined,
      data: "",
      batchCount: 1,
      interval: 1000,
      randomMode: false,
    },
  });

  // 📤 Invio Pacchetto a Tauri
  const onSubmit = async (data: any) => {
    try {
      const hopsArray = data.hops.split(",").map((id: string) => Number(id.trim()));

      if (data.randomMode) {
        // 🎲 Modalità Random
        for (let i = 0; i < data.randomPacketCount; i++) {
          setTimeout(async () => {
            await invoke("send_packet", {
              sender_id: Math.floor(Math.random() * 10) + 1, // ID random tra 1 e 10
              session_id: Math.floor(Math.random() * 10000),
              hops: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () =>
                Math.floor(Math.random() * 10) + 1
              ),
              hop_index: 0,
              fragment_index: Math.floor(Math.random() * 10),
              total_fragments: Math.floor(Math.random() * 10) + 1,
              data: "Random Data",
            });
          }, i * data.randomInterval);
        }
        toast.success(`Inviati ${ data.randomPacketCount } pacchetti randomici`);
      } else if (data.batchCount > 1) {
        // 📦 Invio Multiplo
        for (let i = 0; i < data.batchCount; i++) {
          setTimeout(async () => {
            await invoke("send_packet", {
              sender_id: Number(data.senderId),
              session_id: Number(data.sessionId),
              hops: hopsArray,
              hop_index: 0,
              fragment_index: i,
              total_fragments: data.batchCount,
              data: data.data ?? "",
            });
          }, i * data.interval);
        }
        toast.success(`Inviati ${ data.batchCount } pacchetti con intervallo di ${ data.interval }ms`);
      } else {
        // 📤 Invio Singolo
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
      }
      form.reset(); // Reset form dopo invio
    } catch (error) {
      toast.error(`Errore nell'invio: ${ error }`);
    }
  };

  return (
    <div className="p-6 rounded-lg w-full mx-auto max-w-3xl">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        📦 Invia un Pacchetto
      </h2>

      <Form { ...form }>
        <form onSubmit={ form.handleSubmit(onSubmit) } className="space-y-6">
          {/* GRID - Campi principali */ }
          <div className="grid grid-cols-3 gap-4">
            {/* Sender ID */ }
            <FormField control={ form.control } name="senderId" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Sender ID</FormLabel>
                <FormControl><Input type="number" { ...field } /></FormControl>
                <FormMessage/>
              </FormItem>
            ) }/>

            {/* Session ID */ }
            <FormField control={ form.control } name="sessionId" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Session ID</FormLabel>
                <FormControl><Input type="number" { ...field } /></FormControl>
                <FormMessage/>
              </FormItem>
            ) }/>

            {/* Packet Type */ }
            <FormField control={ form.control } name="packetType" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Tipo di Pacchetto</FormLabel>
                <Select onValueChange={ field.onChange } defaultValue={ field.value }>
                  <FormControl><SelectTrigger><SelectValue
                    placeholder="Seleziona il tipo"/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="MsgFragment">MsgFragment</SelectItem>
                    <SelectItem value="Ack">Ack</SelectItem>
                    <SelectItem value="Nack">Nack</SelectItem>
                    <SelectItem value="FloodRequest">FloodRequest</SelectItem>
                    <SelectItem value="FloodResponse">FloodResponse</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage/>
              </FormItem>
            ) }/>
          </div>

          {/* Percorso (Hops) */ }
          <FormField control={ form.control } name="hops" render={ ({ field }) => (
            <FormItem>
              <FormLabel>Percorso (Hops)</FormLabel>
              <FormControl><Input type="text" { ...field } placeholder="Esempio: 1,2,3,4"/></FormControl>
              <FormMessage/>
            </FormItem>
          ) }/>

          {/* GRID - Campi aggiuntivi (solo se MsgFragment) */ }
          { form.watch("packetType") === "MsgFragment" && (
            <div className="grid grid-cols-2 gap-4">
              <FormField control={ form.control } name="fragmentIndex" render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Fragment Index</FormLabel>
                  <FormControl><Input type="number" { ...field } /></FormControl>
                  <FormMessage/>
                </FormItem>
              ) }/>
              <FormField control={ form.control } name="totalFragments" render={ ({ field }) => (
                <FormItem>
                  <FormLabel>Total Fragments</FormLabel>
                  <FormControl><Input type="number" { ...field } /></FormControl>
                  <FormMessage/>
                </FormItem>
              ) }/>
            </div>
          ) }

          {/* Data (solo per MsgFragment & FloodRequest) */ }
          { ["MsgFragment", "FloodRequest"].includes(form.watch("packetType")) && (
            <FormField control={ form.control } name="data" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Dati</FormLabel>
                <FormControl><Input type="text" { ...field } placeholder="Contenuto del pacchetto"/></FormControl>
                <FormMessage/>
              </FormItem>
            ) }/>
          ) }

          {/* Campi batchCount & interval */ }
          <div className="grid grid-cols-2 gap-4">
            <FormField control={ form.control } name="batchCount" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Numero di Pacchetti</FormLabel>
                <FormControl><Input type="number" { ...field } /></FormControl>
                <FormMessage/>
              </FormItem>
            ) }/>

            <FormField control={ form.control } name="interval" render={ ({ field }) => (
              <FormItem>
                <FormLabel>Intervallo (ms)</FormLabel>
                <FormControl><Input type="number" { ...field } /></FormControl>
                <FormMessage/>
              </FormItem>
            ) }/>
          </div>

          {/* Switch per modalità randomica */ }
          <FormField control={ form.control } name="randomMode" render={ ({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center gap-4">
                <FormLabel className="cursor-pointer">Modalità Random</FormLabel>
                <FormControl>
                  <Switch checked={ isRandomMode } onCheckedChange={ (checked) => {
                    setIsRandomMode(checked);
                    field.onChange(checked);
                  } }
                          className="mt-0"
                  />
                </FormControl>
              </div>
            </FormItem>
          ) }/>


          {/* Pulsante di Invio */ }
          <div className="flex justify-center">
            <Button type="submit">
              Invia Pacchetto
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
