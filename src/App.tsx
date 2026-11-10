import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Header, Footer, BackToTop, CartDrawer, BottomNav, SupportFloat, Preloader } from "@/components/Storefront";
import { StoreProvider } from "@/context/StoreContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { CatalogStatus } from "@/components/CatalogStatus";
import { InteractiveFeatures } from "@/components/InteractiveFeatures";
import { CheckoutFlow, Confirmation, HelpPage } from "@/components/UtilityPages";
import Admin from "@/pages/Admin";
const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CatalogProvider>
        <StoreProvider>
          <BrowserRouter>
            <Header />
            <CatalogStatus />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Index />} />
              <Route path="/shop/:category" element={<Index />} />
              <Route path="/product/:slug" element={<Index />} />
              <Route path="/cart" element={<Index />} />
              <Route path="/checkout" element={<CheckoutFlow />} />
              <Route path="/order-confirmation" element={<Confirmation />} />
              <Route path="/faq" element={<HelpPage />} />
              <Route path="/delivery" element={<HelpPage delivery />} />
              <Route path="/wishlist" element={<Index />} />
              <Route path="/search" element={<Index />} />
              <Route path="/account" element={<Index />} />
              <Route path="/contact" element={<Index />} />
              <Route path="/about" element={<Index />} />
              <Route path="/inspiration" element={<Index />} />
              <Route path="/article/:slug" element={<Index />} />
              <Route path="/sale" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <InteractiveFeatures />
            <Footer />
            <BackToTop />
            <BottomNav />
            <SupportFloat />
            <CartDrawer />
            <Preloader />
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </StoreProvider>
      </CatalogProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
