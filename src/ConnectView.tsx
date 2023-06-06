import { invoke } from "@tauri-apps/api";
import { type ReactElement, useState, type FormEvent, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useCurrentVersion } from "./hook";

export default function ConnectView(): ReactElement {
  const navigate = useNavigate();
  const [host, setHost] = useState("");
  const [port, setPort] = useState(42674);
  const [username, setUsername] = useState("peace-eye");
  const [password, setPassword] = useState("");
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);

  const currentVersion = useCurrentVersion();

  useMemo(() => {
    invoke<boolean>("check_new_version")
      .then((b) => {
        setIsNewVersionAvailable(b);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    await invoke("connect", { host, port, username, password });
    navigate("/connected");
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="font-mono text-2xl">peace-eye v{currentVersion}</h1>
      <form className="form-control w-1/3 p-5" onSubmit={onSubmit}>
        <label className="label label-text">Host</label>
        <input
          className="input-bordered input"
          type="text"
          value={host}
          onChange={(e) => {
            setHost(e.target.value);
          }}
        />
        <label className="label">
          <span className="label-text">Port</span>
          <span
            className="label-text-alt tooltip"
            data-tip="Tacview realtime telemetry server's port (not DCS server's port!)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </label>
        <input
          className="input-bordered input"
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
          className="input-bordered input"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <label className="label label-text">Password</label>
        <input
          className="input-bordered input"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <input className="btn-neutral btn mt-5" type="submit" value="Connect" />
      </form>
      {isNewVersionAvailable && (
        <a
          className="link-primary link text-xl"
          target="_blank"
          rel="noreferrer"
          href="https://github.com/pbzweihander/peace-eye/releases/latest"
        >
          New version available!
        </a>
      )}
    </div>
  );
}
