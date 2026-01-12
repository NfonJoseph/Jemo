import { Store, Users, Truck, Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-12">
      <div className="container-main">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-h1 text-gray-900 mb-4">About Jemo</h1>
          <p className="text-body text-gray-600 max-w-2xl mx-auto">
            Cameroon&apos;s trusted marketplace connecting local vendors with 
            customers. We make it easy to discover quality products from 
            businesses in your community.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              icon: Store,
              title: "Local Vendors",
              description: "Support local businesses and find unique products from Cameroonian vendors.",
            },
            {
              icon: Users,
              title: "Trusted Community",
              description: "All vendors are verified to ensure a safe shopping experience.",
            },
            {
              icon: Truck,
              title: "Fast Delivery",
              description: "Reliable delivery options to get your orders to you quickly.",
            },
            {
              icon: Shield,
              title: "Secure Payments",
              description: "Pay on delivery for peace of mind with every purchase.",
            },
          ].map((feature) => (
            <div key={feature.title} className="card p-6 text-center">
              <div className="w-12 h-12 bg-jemo-orange/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-jemo-orange" />
              </div>
              <h3 className="text-h3 text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-small text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <h2 className="text-h2 text-gray-900 mb-4">Our Mission</h2>
          <p className="text-body text-gray-600 max-w-2xl mx-auto">
            To empower local Cameroonian businesses by providing them with a 
            digital platform to reach more customers, while offering shoppers 
            a convenient and trustworthy way to discover and purchase quality 
            local products.
          </p>
        </div>
      </div>
    </div>
  );
}

