import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { Home } from "./pages/Home";
import { EkgHub } from "./pages/EkgHub";
import { EkgDetail } from "./pages/EkgDetail";
import { CategoryHub } from "./pages/CategoryHub";
import { TopicDetail } from "./pages/TopicDetail";
import { Favorites } from "./pages/Favorites";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/ekg" element={<EkgHub />} />
        <Route path="/ekg/:slug" element={<EkgDetail />} />
        <Route path="/kategori/:slug" element={<CategoryHub />} />
        <Route path="/kategori/:categorySlug/:slug" element={<TopicDetail />} />
        <Route path="/favoriler" element={<Favorites />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
