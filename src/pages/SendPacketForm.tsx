import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";

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
});

export default function SendPacketForm() {
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
