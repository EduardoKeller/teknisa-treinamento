import Link from "next/link";

interface Aba {
  valor: string;
  rotulo: string;
}

export function AbasStatus({ basePath, abas, ativa }: { basePath: string; abas: Aba[]; ativa: string }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
      {abas.map((aba) => (
        <Link
          key={aba.valor}
          href={aba.valor === abas[0].valor ? basePath : `${basePath}?status=${aba.valor}`}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            ativa === aba.valor
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {aba.rotulo}
        </Link>
      ))}
    </div>
  );
}
