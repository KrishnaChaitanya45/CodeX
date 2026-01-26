import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Tooling({
  id = "playgrounds",
  title,
  body,
  features,
  illustration,
}: {
  id?: string;
  title: string;
  body: string;
  features: { icon: string; label: string; description: string }[];
  illustration?: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="lg:order-2">
          <h2 className="text-3xl md:text-4xl font-semibold text-white">{title}</h2>
          <p className="mt-4 text-gray-300 max-w-xl">{body}</p>
          <div className="mt-8 grid gap-4">
            {features.map((f, idx) => {
              const accentColors = [
                "from-blue-500/20 to-blue-500/5 border-blue-500/30",
                "from-purple-500/20 to-purple-500/5 border-purple-500/30",
                "from-pink-500/20 to-pink-500/5 border-pink-500/30",
              ];
              return (
                <Card
                  key={f.label}
                  className={`relative overflow-hidden transition-all duration-300 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 bg-gradient-to-br ${accentColors[idx]}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" role="img" aria-label={f.label}>{f.icon}</span>
                      <CardTitle className="text-base">{f.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-300 relative">
                    {f.description}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:order-1">{illustration}</div>
      </div>
    </section>
  );
}
