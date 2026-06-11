import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const data = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>TT Dashboard</h1>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Phone</th>
            <th>TT</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((c) => (
            <tr key={c.id}>
              <td>{c.ticketNumber}</td>
              <td>{c.phone}</td>
          
              <td>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}