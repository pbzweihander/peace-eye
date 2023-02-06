import { SpinnerCircularFixed } from "spinners-react";

export default function Spinner(): React.ReactElement {
  return (
    <SpinnerCircularFixed
      style={{ display: "inline" }}
      color="rgb(59, 130, 246)"
      secondaryColor="rgb(156, 163, 175)"
    />
  );
}
