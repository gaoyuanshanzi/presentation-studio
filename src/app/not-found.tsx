export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white rounded-xl shadow-md border text-center">
        <h2 className="text-xl font-bold text-slate-800">404 - Page Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">요청하신 페이지를 찾을 수 없습니다.</p>
      </div>
    </div>
  );
}
