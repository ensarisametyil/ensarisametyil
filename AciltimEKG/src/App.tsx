import { Outlet, Routes, Route } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { Home } from "./pages/Home";
import { EkgHub } from "./pages/EkgHub";
import { EkgDetail } from "./pages/EkgDetail";
import { CategoryHub } from "./pages/CategoryHub";
import { CategoriesIndex } from "./pages/CategoriesIndex";
import { TopicDetail } from "./pages/TopicDetail";
import { Favorites } from "./pages/Favorites";
import { SearchPage } from "./pages/SearchPage";
import { NotFound } from "./pages/NotFound";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { Login } from "./pages/admin/Login";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminEkgReadOnly } from "./pages/admin/AdminEkgReadOnly";
import { CategoryTopics } from "./pages/admin/CategoryTopics";
import { TopicForm } from "./pages/admin/TopicForm";

function AdminAuthGate() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/ekg" element={<EkgHub />} />
        <Route path="/ekg/:slug" element={<EkgDetail />} />
        <Route path="/kategoriler" element={<CategoriesIndex />} />
        <Route path="/kategori/:slug" element={<CategoryHub />} />
        <Route path="/kategori/:categorySlug/:slug" element={<TopicDetail />} />
        <Route path="/favoriler" element={<Favorites />} />
        <Route path="/arama" element={<SearchPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AdminAuthGate />}>
        <Route path="/admin/giris" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="ekg" element={<AdminEkgReadOnly />} />
          <Route path=":categorySlug" element={<CategoryTopics />} />
          <Route path=":categorySlug/yeni" element={<TopicForm />} />
          <Route path=":categorySlug/:topicSlug/duzenle" element={<TopicForm />} />
        </Route>
      </Route>
    </Routes>
  );
}
