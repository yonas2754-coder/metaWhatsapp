const services = [
  {
    title: "Building Construction",
  },
  {
    title: "Building Renovation",
  },
  {
    title: "Network Installation",
  },
  {
    title: "Structured Cabling",
  },
  {
    title: "IT Infrastructure",
  },
  {
    title: "Engineering Consultancy",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="bg-gray-100 py-24"
    >
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold mb-12">
          Our Services
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-white p-8 rounded-xl shadow"
            >
              <h3 className="font-semibold text-xl">
                {service.title}
              </h3>

              <p className="mt-4 text-gray-600">
                Professional service delivered
                according to industry standards.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}