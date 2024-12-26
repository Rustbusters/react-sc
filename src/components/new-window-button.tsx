'use client';
import { Button } from "@/components/ui/button";
import { Window } from "@tauri-apps/api/window"

const appWindow = new Window('theUniqueLabel');

export default function NewWindowButton() {
  const openNewWindow = async () => {
    try {
      // Crea una nuova finestra

      await appWindow.once('tauri://created', function () {
        // webview successfully created
        console.log('Nuova finestra creata');
      });
      await appWindow.once('tauri://error', function (error) {
        // an error happened creating the webview
        console.error('Errore nella creazione della finestra', error);

      });

    } catch (error) {
      console.error('Errore nell\'apertura della nuova finestra', error);
    }
  };

  return (
    <Button onClick={ openNewWindow }>
      Apri Nuova Finestra
    </Button>
  );
}