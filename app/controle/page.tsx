import PhoneController from "@/components/phone-controller";

export const metadata = {
  title: "Controle — Terceiro Espaço",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default function ControlPage() {
  return <PhoneController />;
}
