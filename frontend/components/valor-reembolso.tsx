import { formatarValor } from "@/lib/types";

function corReembolso(valor: number) {
  if (valor > 0) return "text-green-700 dark:text-green-400";
  if (valor < 0) return "text-amber-700 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}

function rotuloReembolso(valor: number) {
  if (valor > 0) return "A reembolsar";
  if (valor < 0) return "A devolver à empresa";
  return null;
}

export function ValorReembolso({ valor, destaque = false }: { valor: number; destaque?: boolean }) {
  const cor = corReembolso(valor);
  const rotulo = rotuloReembolso(valor);

  return (
    <span className="inline-block">
      <span className={`font-semibold ${destaque ? "text-lg" : ""} ${cor}`}>{formatarValor(Math.abs(valor))}</span>
      {rotulo && <span className={`block text-xs font-normal ${cor}`}>{rotulo}</span>}
    </span>
  );
}
