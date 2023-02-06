import { invoke } from "@tauri-apps/api";
import { type ReactElement, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function ConnectView(): ReactElement {
  const navigate = useNavigate();
  const [host, setHost] = useState("");
  const [port, setPort] = useState(42674);
  const [username, setUsername] = useState("peace-eye");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    await invoke("connect", { host, port, username, password });
    navigate("/connected");
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <form className="p-5 w-1/3 form-control" onSubmit={onSubmit}>
        <label className="label label-text">Host</label>
        <input
          className="input input-bordered"
          type="text"
          value={host}
          onChange={(e) => {
            setHost(e.target.value);
          }}
        />
        <label className="label label-text">Port</label>
        <input
          className="input input-bordered"
          type="number"
          value={port}
          max={65535}
          min={0}
          onChange={(e) => {
            setPort(Number(e.target.value));
          }}
        />
        <label className="label label-text">Username</label>
        <input
          className="input input-bordered"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <label className="label label-text">Password</label>
        <input
          className="input input-bordered"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <input className="btn mt-5" type="submit" value="Connect" />
      </form>
    </div>
  );
}
