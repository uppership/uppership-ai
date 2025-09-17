import React from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions, ChartData } from "chart.js"; // ✅ type-only import
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface Props {
  regionLabels: string[];
  orderMap: Record<string, number>;
  inventoryMap: Record<string, number>;
}

const RegionBarChart: React.FC<Props> = ({ regionLabels, orderMap, inventoryMap }) => {
  const data: ChartData<"bar"> = {
    labels: regionLabels,
    datasets: [
      {
        label: "Orders (%)",
        data: regionLabels.map((region) => Number(orderMap[region] ?? 0)),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
      {
        label: "Inventory (%)",
        data: regionLabels.map((region) => Number(inventoryMap[region] ?? 0)),
        backgroundColor: "rgba(255, 99, 132, 0.7)",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Percentage",
        },
      },
    },
  };

  return (
    <div className="w-full h-[260px]">
      <Bar data={data} options={options} />
    </div>
  );
};

export default RegionBarChart;
