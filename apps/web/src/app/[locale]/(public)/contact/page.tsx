import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="py-12">
      <div className="container-main">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-h1 text-gray-900 mb-4">Contact Us</h1>
          <p className="text-body text-gray-600 max-w-xl mx-auto">
            Have questions or need help? We&apos;re here for you. Reach out through 
            any of the channels below.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              icon: Mail,
              title: "Email",
              value: "support@jemo.cm",
              description: "Send us an email",
            },
            {
              icon: Phone,
              title: "Phone",
              value: "+237 6XX XXX XXX",
              description: "Call us directly",
            },
            {
              icon: MapPin,
              title: "Location",
              value: "Douala, Cameroon",
              description: "Our headquarters",
            },
            {
              icon: Clock,
              title: "Hours",
              value: "Mon - Sat: 8am - 6pm",
              description: "Customer support",
            },
          ].map((item) => (
            <div key={item.title} className="card p-6 text-center">
              <div className="w-12 h-12 bg-jemo-orange/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-jemo-orange" />
              </div>
              <h3 className="text-h3 text-gray-900 mb-1">{item.title}</h3>
              <p className="text-body font-medium text-jemo-orange mb-1">
                {item.value}
              </p>
              <p className="text-small text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>

        {/* FAQ Teaser */}
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <h2 className="text-h2 text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-body text-gray-600 max-w-xl mx-auto mb-6">
            Looking for quick answers? Check out our most common questions about 
            ordering, delivery, and payments.
          </p>
          <div className="text-sm text-gray-500">
            FAQ section coming soon
          </div>
        </div>
      </div>
    </div>
  );
}

