export default function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#ffffff40] bg-[#ffffff10] p-4 text-center">
      <p className="pri-font text-3xl">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}
