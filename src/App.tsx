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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />

          <Route
            path="hpp"
            element={
              <ProtectedRouteProvider>
                <HPP />
              </ProtectedRouteProvider>
            }
          />
          <Route
            path="nett-profit-generator"
            element={
              <ProtectedRouteProvider>
                <NettProfitGenerator />
              </ProtectedRouteProvider>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
