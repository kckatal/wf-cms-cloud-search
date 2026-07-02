import { DevLinkProvider } from "webflow/DevLinkProvider";
import { Footer } from "webflow/Footer";

export default function SiteNav() {
  return (
    <DevLinkProvider>
      <Footer />
    </DevLinkProvider>
  );
}
