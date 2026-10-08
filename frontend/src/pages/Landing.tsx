import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Search } from "lucide-react"; // logo
import { Link } from "react-router-dom";

const getTodayIso = () => new Date().toISOString().slice(0, 10);

export default function Landing() {
  const nav = useNavigate();
  const [zip, setZip] = useState("21218");
  const [start, setStart] = useState(getTodayIso());
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const todayIso = getTodayIso();

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date(todayIso);
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (startDate < today) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (!end) {
      setError("Please select an end date.");
      return;
    }

    if (endDate && endDate < today) {
      setError("End date cannot be in the past.");
      return;
    }

    if (endDate && endDate <= startDate) {
      setError("End date must be later than start date.");
      return;
    }

    setError(""); // delete error tips
    nav(`/search?zip=${zip}&start=${start}&end=${end}`);
  };

  return (
    <main className="flex flex-col min-h-screen">
      {/* top：search */}
      <section className="bg-gradient-to-br from-emerald-50 to-sky-50 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold mb-6 max-w-2xl">
          Find a Perfect{" "}
          <span className="text-emerald-700">Plant Sitter</span> Near You.
        </h1>

        <form
          onSubmit={goSearch}
          className="flex gap-3 bg-white p-4 rounded-2xl shadow"
        >
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="21218"
            className="px-3 py-2 rounded-xl border"
          />
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            min={todayIso}
            className="px-3 py-2 rounded-xl border"
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            min={start || todayIso}
            className="px-3 py-2 rounded-xl border"
          />
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-2">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>

        {/* error tips */}
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </section>

      {/* bottom: apply to be a caretaker*/}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50 px-4 text-center">
        <div className="max-w-2xl mx-auto text-amber-800 space-y-4">
          <div className="flex items-center justify-center gap-3 text-3xl font-bold text-amber-600">
            <Leaf className="w-8 h-8 text-amber-500" />
            Share your plant superpowers
          </div>
          <p className="text-lg text-amber-700">
            Help fellow plant parents when they travel. Become a verified BloomNet plant sitter and get matched with thriving greenery around campus.
          </p>
          <Link
            to="/sitter-portal"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-full bg-amber-400 text-white shadow-lg hover:bg-amber-300 transition"
          >
            Apply to Be a Plant Sitter
          </Link>
        </div>
      </section>
    </main>
  );
}
