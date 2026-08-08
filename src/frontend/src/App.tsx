import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddSession from "./pages/AddSession";
import History from "./pages/History";
import EditSession from "./pages/EditSession";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddSession />} />
        <Route path="/history" element={<History />} />
        <Route path="/edit/:id" element={<EditSession />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
