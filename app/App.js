"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as store from "../lib/store.js";
import { eventFromText } from "../lib/format.js";
import { eventIdFromUrl, textFromUrl } from "../lib/link.js";
import { installAgentApi } from "../lib/agent.js";
import Home from "./Home.js";
import EventView from "./EventView.js";

const selectEvents = () => store.getSnapshot().events;
const selectNoEvents = () => store.getServerSnapshot().events;

export default function App() {
  const events = useSyncExternalStore(
    store.subscribe,
    selectEvents,
    selectNoEvents,
  );
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

    // A shared link opens its list and keeps a copy on this device. A link
    // made from an event already here replaces it (with an undo).
    const receive = (text) => {
      const incoming = eventFromText(text);
      const previous = store.getEvent(incoming.id);
      if (previous) {
        store.saveEvent({ ...incoming, createdAt: previous.createdAt });
        notify("Liste mise à jour depuis le lien.", {
          label: "Annuler",
          run: () => store.saveEvent(previous),
        });
      } else {
        store.saveEvent(incoming);
        notify("Liste ajoutée sur cet appareil 🎉");
      }
      const path = window.location.pathname;
      window.history.replaceState(null, "", `${path}#/${incoming.id}`);
      return incoming.id;
    };

    const sync = () => {
      const href = window.location.href;
      const text = textFromUrl(href);
      const id = text ? receive(text) : eventIdFromUrl(href);
      setRoute({ ready: true, id });
      window.scrollTo(0, 0);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [notify]);

  const event = route.id ? events.find((e) => e.id === route.id) : null;

  return (
    <>
      {!route.ready ? (
        <div className="loading" aria-hidden="true" />
      ) : route.id ? (
        <EventView event={event} id={route.id} notify={notify} />
      ) : (
        <Home events={events} notify={notify} />
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
