export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h3 className="font-bold text-xl">
          Henok Dejjene and Their Friend
          General Construction P/S
        </h3>

        <p className="mt-4 text-slate-400">
          Addis Ababa, Ethiopia
        </p>

        <p className="mt-2 text-slate-400">
          © {new Date().getFullYear()} All Rights Reserved
        </p>
      </div>
    </footer>
  );
}