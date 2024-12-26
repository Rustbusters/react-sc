import React, { useState } from "react";
import { Button } from "@/components/ui/button.tsx";

export const CustomComponent = () => {

  const [state, setState] = useState<number>(0);

  console.log('RENDER MyComponent'); // si vede a ogni re-render

  React.useEffect(() => {
    console.log('MOUNT MyComponent'); // si vede solo al primo mount
    return () => {
      console.log('UNMOUNT MyComponent'); // si vede all’unmount
    };
  }, []);

  return (
    <div>
      <Button onClick={ () => setState(state + 1) } variant="destructive">Increase</Button>
      <p>{ state }</p>
    </div>
  );

}