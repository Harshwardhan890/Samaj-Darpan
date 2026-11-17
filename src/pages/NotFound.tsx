import { Link } from "react-router-dom";
import { ArrowLeft, Compass, MapPin } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFoundPage({
  title = "This page does not exist",
  description = "The address may be mistyped, or the record may have been removed. Public records are never silently replaced with invented content.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="container-page flex min-h-[66vh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-ink-500">
          <Compass size={24} />
        </span>
        <p className="mt-5 font-display text-[3rem] leading-none text-navy-900">404</p>
        <h1 className="mt-2 text-2xl">{title}</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={14} /> National overview
          </Link>
          <Link to="/projects" className="btn btn-outline">
            <MapPin size={14} /> Browse projects
          </Link>
        </div>
      </div>
    </div>
  );
}
