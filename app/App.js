"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as store from "../lib/store.js";
import { docFromText } from "../lib/format.js";
import { docIdFromUrl, textFromUrl } from "../lib/link.js";
import { installAgentApi } from "../lib/agent.js";
import Home from "./Home.js";
import DocView from "./DocView.js";

const selectDocs = () => store.getSnapshot().docs;
const selectNoDocs = () => store.getServerSnapshot().docs;

export default function App() {
  const docs = useSyncExternalStore(store.subscribe, selectDocs, selectNoDocs);
  const [route, setRoute] = useState({ ready: false, id: null });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, action) => {
    clearTimeout(toastTimer.current);
    setToast({ message, action, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), action ? 8000 : 4000);
  }, []);

  useEffect(() => {
    installAgentApi();

    // A shared link opens its lists and keeps a copy on this device. A link
    // made from a document already here replaces it (with an undo).
    const receive = (text) => {
      const incoming = docFromText(text);
      const previous = store.getDoc(incoming.id);
      if (previous) {
        store.saveDoc({ ...incoming, createdAt: previous.createdAt });
        notify("Liste mise à jour depuis le lien.", {
          label: "Annuler",
          run: () => store.saveDoc(previous),
        });
      } else {
        store.saveDoc(incoming);
        notify("Liste ajoutée sur cet appareil.");
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#/${incoming.id}`,
      );
      return incoming.id;
    };

    const sync = () => {
      const href = window.location.href;
      const text = textFromUrl(href);
      setRoute({ ready: true, id: text ? receive(text) : docIdFromUrl(href) });
      window.scrollTo(0, 0);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [notify]);

  const doc = route.id ? docs.find((d) => d.id === route.id) : null;

  return (
    <>
      {!route.ready ? (
        <div className="loading" aria-hidden="true" />
      ) : route.id ? (
        <DocView doc={doc} id={route.id} notify={notify} />
      ) : (
        <Home docs={docs} notify={notify} />
      )}
      <div className="toast-zone" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.key}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
