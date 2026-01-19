import { FC } from "react";
import { Dashboard } from "./pages/Dashboard";
import "./styles/App.css";

const App: FC = () => {
  return (
    <div className="app">
      <Dashboard />
    </div>
  );
};

export default App;
