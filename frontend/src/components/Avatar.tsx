export default function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("");
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 flex items-center justify-center text-white font-semibold text-xl">
      {initials}
    </div>
  );
}
