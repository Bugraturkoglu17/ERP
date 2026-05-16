import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-content-center rounded-xl bg-blue-600 text-xl font-bold text-white">
          SM
        </div>
        <h1 className="text-xl font-bold text-gray-900">Kayit icin yonetici onayi gerekli</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Bu ERP kurulumunda herkese acik kayit ekrani henuz aktif degil. Size verilen
          kullanici bilgileriyle giris yapabilirsiniz.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          Giris sayfasina git
        </Link>
      </div>
    </div>
  );
}
