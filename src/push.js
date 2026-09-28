// Maneja la suscripción del vendedor a notificaciones push.
// El permiso del sistema (iOS/Android) se pide UNA sola vez, la primera
// vez que se llama a suscribir(); después queda guardado y no se vuelve
// a preguntar.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function base64UrlToUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) outputArray[i] = raw.charCodeAt(i);
  return outputArray;
}

export function soportaPush() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function suscribirVendedor(vendorId) {
  if (!soportaPush()) throw new Error("Este navegador no soporta notificaciones.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Falta configurar VITE_VAPID_PUBLIC_KEY.");

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste permiso para las notificaciones.");

  const registro = await navigator.serviceWorker.ready;
  let subscription = await registro.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const res = await fetch("/api/save-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorId, subscription: subscription.toJSON() }),
  });
  if (!res.ok) throw new Error("No se pudo guardar la suscripción.");
  return true;
}

// Si este celu ya tiene el permiso y una suscripción, la registra también
// para el vendedor que está usando la app (por ejemplo, al cambiar de usuario
// en el mismo celular). No pregunta nada. Devuelve true si registró.
export async function registrarSiYaSuscripto(vendorId) {
  if (!soportaPush() || Notification.permission !== "granted") return false;
  const registro = await navigator.serviceWorker.ready;
  const subscription = await registro.pushManager.getSubscription();
  if (!subscription) return false;
  const res = await fetch("/api/save-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorId, subscription: subscription.toJSON() }),
  });
  return res.ok;
}

export async function yaEstaSuscripto() {
  if (!soportaPush()) return false;
  const registro = await navigator.serviceWorker.ready;
  const subscription = await registro.pushManager.getSubscription();
  return !!subscription;
}

export async function notificarDespacho(vendorId, mensaje) {
  try {
    await fetch("/api/notify-dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, mensaje }),
    });
  } catch (e) {
    console.error("No se pudo enviar la notificación:", e);
  }
}
