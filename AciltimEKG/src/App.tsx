import { Routes, Route } from "react-router-dom";
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
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminList } from "./pages/admin/AdminList";

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
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="icerikler" element={<AdminList kind="all" />} />
        <Route path="kategoriler" element={<AdminList kind="category" />} />
        <Route path="ilaclar" element={<AdminList kind="drug" />} />
        <Route path="ritimler" element={<AdminList kind="rhythm" />} />
        <Route path="algoritmalar" element={<AdminList kind="algorithm" />} />
        <Route path="makaleler" element={<AdminList kind="article" />} />
      </Route>
    </Routes>
  );
}
