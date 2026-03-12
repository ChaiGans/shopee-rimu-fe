import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import About from "./pages/About";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import HPP from "./pages/HPP";
import ProtectedRouteProvider from "./components/provider/ProtectedRouteProvider";
import NettProfitGenerator from "./pages/NettProfitGenerator";
import AutoShippingConfig from "./pages/AutoShippingConfig";
import WarehousePerhitunganSelisih from "./pages/WarehousePerhitunganSelisih";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <ProtectedRouteProvider>
                <Home />
              </ProtectedRouteProvider>
            }
          />
          <Route path="about" element={<About />} />

          <Route
            path="utilities/hpp"
            element={
              <ProtectedRouteProvider>
                <HPP />
              </ProtectedRouteProvider>
            }
          />
          <Route
            path="utilities/nett-profit-generator"
            element={
              <ProtectedRouteProvider>
                <NettProfitGenerator />
              </ProtectedRouteProvider>
            }
          />
          <Route
            path="logistics/auto-shipping-config"
            element={
              <ProtectedRouteProvider>
                <AutoShippingConfig />
              </ProtectedRouteProvider>
            }
          />
          <Route
            path="warehouse/perhitungan-selisih"
            element={<WarehousePerhitunganSelisih />}
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
