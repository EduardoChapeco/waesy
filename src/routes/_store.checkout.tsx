import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveOrderBumpForCart, type OrderBumpOfferDTO } from "@/services/upsell.functions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { getCart, getGlobalCarts, cancelCart, updateCartShipping, applyCouponToCart, updateCartContact } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { checkGiftCardBalance } from "@/services/giftcard.functions";
import { processCheckout, getStoreCheckoutConfig, type CheckoutDynamicConfig } from "@/services/checkout.functions";
import { initiatePaymentTransaction, getPublicPaymentMethods, getGatewayStatus } from "@/services/payment.functions";
import { calculateShipping } from "@/services/shipping.functions";
import { getPublicStoreProfile } from "@/services/catalog.functions";
import { getProfile } from "@/services/auth.functions";
import { getUserAddresses, validateDeliveryLocationGPS } from "@/services/addresses.functions";
import { DeliveryLocationPolicySheet } from "@/components/commerce/delivery-location-policy-sheet";
import { GpsMismatchModal } from "@/components/commerce/gps-mismatch-modal";
import { Check, CheckCircle2, Ticket, User, Truck, CreditCard, ShoppingBag, AlertCircle, MapPin, Loader2, Gift, QrCode, Clock, Store, ChevronRight, ArrowLeft, Navigation, Layers, Plus, ShieldCheck, Building2, ShieldAlert, Plane, Users, Calendar, Sparkles, FileText, Trash2, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { humanizeErrorMessage } from "@/lib/humanize-error";
import { DocumentField } from "@/components/ui/document-field";
import { CepField } from "@/components/ui/cep-field";
import { PhoneField } from "@/components/ui/phone-field";
import { CreditCardNumberInput, CardExpiryInput, CardCvvInput } from "@/components/ui/credit-card-field";
import { Surface } from "@/components/ui/surface";
import { getNicheSemantics } from "@/lib/niche-semantics";

export const Route = createFileRoute("/_store/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Waesy" }] }),
  validateSearch: (search: Record<string, unknown>): { store?: string } => {
    return {
      store: (search.store as string) || undefined,
    };
  },
  loaderDeps: ({ search: { store } }) => ({ store }),
  loader: async ({ deps: { store } }) => {
    try {
      const [
        cart,
        globalCarts,
        profileRes,
        paymentMethodsRes,
        gatewayStatus,
        userProfile,
        userAddresses,
        checkoutConfigRes,
      ] = await Promise.all([
        getCart(store ? { data: { storeId: store } } : undefined).catch((e) => {
          console.warn("[checkout] getCart fallback:", e);
          return null;
        }),
        getGlobalCarts().catch(() => []),
        getPublicStoreProfile(store ? { data: { storeId: store } } : undefined).catch(() => null),
        getPublicPaymentMethods(store ? { data: { storeId: store } } : undefined).catch(() => []),
        getGatewayStatus(store ? { data: { storeId: store } } : undefined).catch(() => false),
        getProfile().catch(() => null),
        getUserAddresses().catch(() => []),
        getStoreCheckoutConfig({ data: { storeId: store || undefined } }).catch(() => null),
      ]);

      const matchingCart = store
        ? (globalCarts.find((c: any) => c.storeId === store) || cart)
        : (cart || (globalCarts.length > 0 ? globalCarts[0] : null));

      return {
        initialCart: matchingCart || {
          id: "",
          items: [],
          totalCents: 0,
          subtotalCents: 0,
          discountCents: 0,
          shippingCents: 0,
          shippingMethod: "",
          couponCode: null,
          itemCount: 0,
        },
        globalCarts,
        storeProfile: profileRes || null,
        paymentMethods: paymentMethodsRes || [],
        isGatewayConfigured: gatewayStatus || false,
        userProfile: userProfile || null,
        userAddresses: userAddresses || [],
        checkoutConfig: (checkoutConfigRes as CheckoutDynamicConfig | null) || null,
      };
    } catch (err) {
      console.error("[loader:_store.checkout] Unhandled loader error:", err);
      return {
        initialCart: {
          id: "",
          items: [],
          totalCents: 0,
          subtotalCents: 0,
          discountCents: 0,
          shippingCents: 0,
        },
        globalCarts: [],
        storeProfile: null,
        paymentMethods: [],
        isGatewayConfigured: false,
        userProfile: null,
        userAddresses: [],
        checkoutConfig: null,
      } as any;
    }
  },
  component: CheckoutPage,
});

interface ManualPaymentOption {
  id: string;
  name: string;
  instructions: string;
  surcharge_percentage: number;
  discount_percentage: number;
}

export function CheckoutPage() {
  const {
    initialCart,
    globalCarts,
    storeProfile,
    paymentMethods,
    userProfile,
    userAddresses,
    isGatewayConfigured,
    checkoutConfig,
  } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const router = useRouter();
  const { refreshCart } = useCartContext();

  const [cart, setCart] = useState(initialCart);
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── V11: Order Bump State & Contextual Query ──
  const [isOrderBumpAccepted, setIsOrderBumpAccepted] = useState(false);
  const cartProductIds = useMemo(() => {
    return (cart?.items || [])
      .map((it: any) => it.productId || it.product_id || it.product?.id)
      .filter(Boolean);
  }, [cart?.items]);

  const { data: orderBumpOffer } = useQuery({
    queryKey: ["active-order-bump", storeProfile?.id || cart?.storeId, cartProductIds],
    queryFn: () =>
      getActiveOrderBumpForCart({
        data: {
          storeId: storeProfile?.id || cart?.storeId || undefined,
          cartProductIds,
        },
      }),
    enabled: Boolean(cart?.items && cart.items.length > 0),
  });

  // ── V10: Multi-Nicho Dynamic Checkout States ──
  const [cpfRequested, setCpfRequested] = useState<boolean>(
    Boolean(userProfile?.cpf || checkoutConfig?.cpfOnReceipt?.defaultRequested || false)
  );
  const [cpfDocument, setCpfDocument] = useState<string>(userProfile?.cpf || "");
  const [substitutionPolicy, setSubstitutionPolicy] = useState<"similar" | "contact" | "cancel" | "none">(
    checkoutConfig?.substitutionPolicy?.default || "similar"
  );
  const [receiverMode, setReceiverMode] = useState<"self" | "other">("self");
  const [receiverName, setReceiverName] = useState<string>("");
  const [receiverPhone, setReceiverPhone] = useState<string>("");
  const [utensilsRequested, setUtensilsRequested] = useState<boolean>(false);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [openItemNoteId, setOpenItemNoteId] = useState<string | null>(null);

  // ── Metamorphic Niche Semantics & Category Resolution (Zero Generics / Zero Mocks) ──
  const storeSemantics = useMemo(() => getNicheSemantics(storeProfile), [storeProfile]);

  const hasTourismItem = Boolean(
    cart?.items &&
      cart.items.some(
        (i: any) =>
          i.category === "tourism" ||
          i.item_type === "trip" ||
          i.item_type === "travel" ||
          i.package_type ||
          i.travel_data ||
          /tour|viag|turis|travel|hotel|pousad|guia|excurs|passeio|roteir|passag|aereo|cruzeir|resort|ilheus|porto seguro|salvador|gramado|natal|maceio|fortaleza|cancun|paris|orlando|disney/i.test(
            i.productTitle || i.title || ""
          )
      )
  );

  const isTourismNiche =
    storeSemantics.nicheId === "tourism" ||
    checkoutConfig?.niche === "tourism" ||
    storeProfile?.niche === "tourism" ||
    storeProfile?.settings?.niche === "tourism" ||
    storeProfile?.settings?.segment === "tourism" ||
    storeProfile?.settings?.type === "tourism" ||
    hasTourismItem;

  const hasDigitalItem = Boolean(
    cart?.items &&
      cart.items.some(
        (i: any) =>
          i.is_physical === false ||
          i.category === "digital" ||
          i.item_type === "digital" ||
          /curso|ebook|software|template|ingresso|voucher|mentoria digital|download/i.test(
            i.productTitle || i.title || ""
          )
      )
  );

  const isAllDigitalCart = Boolean(
    cart?.items &&
      cart.items.length > 0 &&
      cart.items.every(
        (i: any) =>
          i.is_physical === false ||
          i.category === "digital" ||
          i.item_type === "digital" ||
          /curso|ebook|software|template|ingresso|voucher/i.test(
            i.productTitle || i.title || ""
          )
      )
  );

  const isDigitalNiche =
    !isTourismNiche &&
    (storeSemantics.nicheId === "education" || isAllDigitalCart);

  const hasServiceItem = Boolean(
    cart?.items &&
      cart.items.some(
        (i: any) =>
          i.type === "service" ||
          i.item_type === "service" ||
          i.category === "services" ||
          i.appointment_data ||
          i.service_duration
      )
  );

  const isServiceNiche =
    !isTourismNiche &&
    !isDigitalNiche &&
    (storeSemantics.nicheId === "services" ||
      storeSemantics.nicheId === "legal" ||
      storeSemantics.nicheId === "tech_repair" ||
      checkoutConfig?.niche === "services" ||
      storeProfile?.niche === "services" ||
      storeProfile?.settings?.niche === "services" ||
      hasServiceItem);

  const isFoodNiche =
    !isTourismNiche &&
    !isDigitalNiche &&
    (storeSemantics.nicheId === "gastronomy" ||
      storeSemantics.isFoodBusiness ||
      checkoutConfig?.niche === "food" ||
      checkoutConfig?.niche === "gastronomy" ||
      storeProfile?.niche === "food" ||
      storeProfile?.niche === "gastronomy");

  const isSupermarketNiche =
    !isTourismNiche &&
    !isDigitalNiche &&
    (storeSemantics.nicheId === "supermarket" ||
      checkoutConfig?.niche === "supermarket");

  const isRentalNiche =
    !isTourismNiche &&
    !isDigitalNiche &&
    (storeSemantics.nicheId === "rental" ||
      checkoutConfig?.niche === "rental" ||
      Boolean(cart?.items && cart.items.some((i: any) => i.rental_days || i.item_type === "rental")));

  const isPhysicalDelivery = !isTourismNiche && !isDigitalNiche && !isServiceNiche;

  // ── V200: Metamorphic States (Tourism / Digital / Services) ──
  const [travelDepartureDate, setTravelDepartureDate] = useState("");
  const [travelReturnDate, setTravelReturnDate] = useState("");
  const [travelBoardingPoint, setTravelBoardingPoint] = useState("Balcão da Agência");
  const [travelSpecialRequests, setTravelSpecialRequests] = useState("");
  const [passengers, setPassengers] = useState<Array<{
    id: string;
    name: string;
    document: string;
    birthDate: string;
    phone?: string;
    isLead?: boolean;
  }>>([
    {
      id: "p-lead",
      name: userProfile?.fullName || "",
      document: userProfile?.cpf || "",
      birthDate: "",
      phone: userProfile?.phone || "",
      isLead: true,
    },
  ]);

  const [serviceDate, setServiceDate] = useState("");
  const [serviceTimeSlot, setServiceTimeSlot] = useState("");
  const [serviceLocationType, setServiceLocationType] = useState<"store" | "home">("store");

  // Credit card states
  const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
  const [creditCardData, setCreditCardData] = useState({
    number: "",
    holderName: "",
    expiryDate: "",
    cvv: "",
  });

  // Shipping & Address states
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [noShippingRatesFound, setNoShippingRatesFound] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // ── V139: Omni-Checkout, Waesy Go & Trust/Safety States ──
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [deliveryToDoor, setDeliveryToDoor] = useState(false);
  const [doorDeliveryFeeCents, setDoorDeliveryFeeCents] = useState(500); // R$ 5,00 padrão para taxa de porta
  const [apartmentDetails, setApartmentDetails] = useState({ blockTower: "", intercomCode: "" });
  const [isPolicySheetOpen, setIsPolicySheetOpen] = useState(false);
  const [isGpsMismatchModalOpen, setIsGpsMismatchModalOpen] = useState(false);
  const [gpsMismatchDistanceKm, setGpsMismatchDistanceKm] = useState(0);
  const [hasValidatedGpsMismatch, setHasValidatedGpsMismatch] = useState(false);

  // Promo & Gift Card code states
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
 const [appliedGiftCard, setAppliedGiftCard] = useState<{
 code: string;
 balanceCents: number;
 } | null>(null);

 // Custom checkout fields & Order notes
 const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
 const [orderNotes, setOrderNotes] = useState("");

 // Form state
 const [formData, setFormData] = useState({
 customerName: "",
 customerEmail: "",
 customerPhone: "",
 customerDocument: "",
 paymentMethod: (isGatewayConfigured
 ? "pix"
 : paymentMethods.length > 0
 ? "manual"
 : "receipt") as "pix" | "manual" | "credit_card" | "receipt",
 paymentMethodId: (!isGatewayConfigured && paymentMethods.length > 0
 ? (paymentMethods[0] as any).id
 : "") as string,
 shippingMethod: "manual_table" as "manual_table" | "pickup" | "manual_quote",
 deliverySlot: "expressa",
 substitutionPolicy: "similar" as "similar" | "contact" | "cancel",
 shippingAddress: {
 zipcode: "",
 street: "",
 number: "",
 complement: "",
 neighborhood: "",
 city: "",
 state: "",
 },
 });

 // Sync local cart
 useEffect(() => {
 setCart(initialCart);
 }, [initialCart]);

 // Pre-fill user profile info if logged in
 useEffect(() => {
 if (userProfile) {
 setFormData((prev) => ({
 ...prev,
 customerName: prev.customerName || userProfile.fullName || "",
 customerEmail: prev.customerEmail || userProfile.email || "",
 customerPhone: prev.customerPhone || userProfile.phone || "",
 customerDocument: prev.customerDocument || userProfile.cpf || "",
 }));
 if (userProfile.cpf && !cpfDocument) {
 setCpfDocument(userProfile.cpf);
 setCpfRequested(true);
 }
 }
 }, [userProfile]);

  // Sync lead passenger when customer identification fields change
  useEffect(() => {
    if (formData.customerName || formData.customerDocument || formData.customerPhone) {
      setPassengers((prev) => {
        if (!prev || prev.length === 0) {
          return [
            {
              id: "p-lead",
              name: formData.customerName,
              document: formData.customerDocument,
              birthDate: "",
              phone: formData.customerPhone,
              isLead: true,
            },
          ];
        }
        return [
          {
            ...prev[0],
            name: prev[0].name || formData.customerName,
            document: prev[0].document || formData.customerDocument,
            phone: prev[0].phone || formData.customerPhone,
          },
          ...prev.slice(1),
        ];
      });
    }
  }, [formData.customerName, formData.customerDocument, formData.customerPhone]);

 // Pre-fill default saved address if available
 useEffect(() => {
 if (userAddresses && userAddresses.length > 0) {
 const defaultAddr = userAddresses.find((a: any) => a.is_default) || userAddresses[0];
 if (defaultAddr && defaultAddr.zipcode) {
 const cleanZip = defaultAddr.zipcode.replace(/\D/g, "");
 setFormData((prev) => {
 if (prev.shippingAddress.zipcode) return prev;
 return {
 ...prev,
 shippingAddress: {
 zipcode: cleanZip,
 street: defaultAddr.street || defaultAddr.address_line1 || "",
 number: defaultAddr.number || "",
 complement: defaultAddr.complement || "",
 neighborhood: defaultAddr.neighborhood || defaultAddr.bairro || "",
 city: defaultAddr.city || "",
 state: defaultAddr.state || "",
 },
 };
 });
 if (cleanZip.length === 8) {
 handleCepChange(cleanZip, true);
 }
 }
 } else {
 setShowNewAddressForm(true);
 }
 }, [userAddresses]);

 // Step progression handler
 const handleAdvanceToDelivery = async () => {
 try {
 if (formData.customerEmail || formData.customerPhone) {
 await updateCartContact({
 data: {
 guestEmail: formData.customerEmail || undefined,
 guestPhone: formData.customerPhone || undefined,
 },
 });
 }
 } catch (e) {
 console.error("Falha silenciosa ao atualizar contato:", e);
 }
 setActiveStep(2);
 };

 const handleCepChange = async (val: string, skipAutofill = false) => {
 const cep = val.replace(/\D/g, "");
 setFormData((prev) => ({
 ...prev,
 shippingAddress: { ...prev.shippingAddress, zipcode: cep },
 }));

 if (cep.length === 8) {
 setIsCalculatingShipping(true);
 setNoShippingRatesFound(false);
 try {
 if (!skipAutofill) {
 const zipRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
 const zipData = await zipRes.json();
 if (!zipData.erro) {
 setFormData((prev) => ({
 ...prev,
 shippingAddress: {
 ...prev.shippingAddress,
 street: zipData.logradouro || prev.shippingAddress.street,
 neighborhood: zipData.bairro || prev.shippingAddress.neighborhood,
 city: zipData.localidade || prev.shippingAddress.city,
 state: zipData.uf || prev.shippingAddress.state,
 },
 }));
 }
 }

    const shipRes = await calculateShipping({
      data: {
        zipcode: cep,
        cartId: cart?.id || undefined,
        storeId: (cart as any)?.storeId || storeProfile?.id || undefined,
      },
    });
    if (shipRes && Array.isArray(shipRes) && shipRes.length > 0) {
 setShippingRates(shipRes);
 setNoShippingRatesFound(false);
 // Auto select first rate
 handleSelectRate(shipRes[0]);
 } else {
 setShippingRates([]);
 setNoShippingRatesFound(true);
 }
 } catch (err) {
 console.error("Erro no cálculo de frete:", err);
 toast.error("Erro ao calcular o frete.");
 } finally {
 setIsCalculatingShipping(false);
 }
 } else {
 setShippingRates([]);
 }
 };

 const handleGPSLocation = () => {
 if (typeof navigator === "undefined" || !navigator.geolocation) {
 toast.error("Geolocalização não suportada neste dispositivo.");
 return;
 }

 setIsLocatingGPS(true);
 navigator.geolocation.getCurrentPosition(
 async (pos) => {
 try {
 const { latitude, longitude } = pos.coords;
 const res = await fetch(
 `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
 );
 const data = await res.json();
 if (data && data.address) {
 const addr = data.address;
 const cep = (addr.postcode || "").replace(/\D/g, "");
 setFormData((prev) => ({
 ...prev,
 shippingAddress: {
 ...prev.shippingAddress,
 zipcode: cep || prev.shippingAddress.zipcode,
 street: addr.road || prev.shippingAddress.street,
 neighborhood: addr.suburb || addr.neighbourhood || prev.shippingAddress.neighborhood,
 city: addr.city || addr.town || addr.municipality || prev.shippingAddress.city,
 state: addr.state || prev.shippingAddress.state,
 },
 }));
 toast.success("Endereço preenchido via GPS!");
 if (cep.length === 8) {
 handleCepChange(cep, true);
 }
 }
 } catch {
 toast.error("Não foi possível resolver o endereço via GPS.");
 } finally {
 setIsLocatingGPS(false);
 }
 },
 (err) => {
 console.warn("GPS error:", err);
 toast.error("Permissão de localização negada ou indisponível.");
 setIsLocatingGPS(false);
 },
 { timeout: 10000 }
 );
 };

 const handleSelectRate = async (rate: any) => {
 setSelectedRateId(rate.id);
 setFormData((prev) => ({ ...prev, shippingMethod: "manual_table" }));

 try {
 await updateCartShipping({
 data: {
 method: "delivery",
 zipcode: formData.shippingAddress.zipcode,
 cents: rate.price_cents,
 },
 });
 router.invalidate();
 } catch {
 toast.error("Erro ao atualizar frete.");
 }
 };

 const handleSelectPickup = async () => {
 setSelectedRateId("pickup");
 setFormData((prev) => ({ ...prev, shippingMethod: "pickup" }));

 try {
 await updateCartShipping({
 data: { method: "pickup", zipcode: "", cents: 0 },
 });
 router.invalidate();
 } catch {
 toast.error("Erro ao atualizar retirada.");
 }
 };

 const getSelectedPaymentMethodInfo = () => {
 if (formData.paymentMethod === "manual" && formData.paymentMethodId) {
 const match = paymentMethods.find((p: any) => p.id === formData.paymentMethodId);
 if (match) return match as ManualPaymentOption;
 }
 return null as any;
    };

 const paymentSettings = storeProfile?.settings?.payment_settings || {};
 const pixDiscountPercent = Number(paymentSettings.pix_discount_percentage || 0);
 const maxInstallments = Number(paymentSettings.max_installments || 1);
 const interestFreeInstallments = Number(paymentSettings.interest_free_installments || 3);
 const installmentInterestRate = Number(paymentSettings.installment_interest_rate || 2.99);

 const paymentInfo = getSelectedPaymentMethodInfo();
 let paymentSurchargeCents = 0;
 let paymentDiscountCents = 0;

 if (paymentInfo) {
 if (Number(paymentInfo.discount_percentage) > 0) {
 paymentDiscountCents = Math.floor(
 cart.subtotalCents * (Number(paymentInfo.discount_percentage) / 100)
 );
 } else if (Number(paymentInfo.surcharge_percentage) > 0) {
 paymentSurchargeCents = Math.floor(
 cart.subtotalCents * (Number(paymentInfo.surcharge_percentage) / 100)
 );
 }
 } else if (formData.paymentMethod === "pix" && pixDiscountPercent > 0) {
 paymentDiscountCents = Math.floor(cart.subtotalCents * (pixDiscountPercent / 100));
 }

 const calculateInstallmentOptions = (totalCents: number) => {
 const maxInst = maxInstallments;
 const freeInst = interestFreeInstallments;
 const monthlyRate = installmentInterestRate / 100;

 const options = [];
 for (let i = 1; i <= maxInst; i++) {
 if (i <= freeInst) {
 const installmentValue = Math.round(totalCents / i);
 options.push({
 number: i,
 valueCents: installmentValue,
 totalCents: installmentValue * i,
 interestFree: true,
 formattedText: `${i}x de ${formatMoney(installmentValue)} sem juros`,
 });
 } else {
 const p = totalCents;
 const r = monthlyRate;
 const n = i;
 let installmentValue = 0;
 if (r === 0) {
 installmentValue = Math.round(p / n);
 } else {
 const factor = Math.pow(1 + r, n);
 installmentValue = Math.round((p * (r * factor)) / (factor - 1));
 }
 options.push({
 number: i,
 valueCents: installmentValue,
 totalCents: installmentValue * n,
 interestFree: false,
 formattedText: `${i}x de ${formatMoney(installmentValue)} com juros`,
 });
 }
 }
 return options;
 };
      const passengerCount = isTourismNiche ? Math.max(1, passengers.length) : 1;
      const effectiveSubtotalCents = isTourismNiche
        ? cart.subtotalCents * passengerCount
        : cart.subtotalCents;

      const doorFeeCents = (!isPhysicalDelivery) ? 0 : (formData.shippingMethod !== "pickup" && deliveryToDoor) ? doorDeliveryFeeCents : 0;
      const effectiveShippingCents = !isPhysicalDelivery || formData.shippingMethod === "pickup" ? 0 : cart.shippingCents;
      const orderBumpExtraCents = isOrderBumpAccepted && orderBumpOffer ? orderBumpOffer.offerPriceCents : 0;
      const preGiftTotalCents =
        effectiveSubtotalCents +
        effectiveShippingCents +
        doorFeeCents +
        orderBumpExtraCents -
        cart.discountCents -
        paymentDiscountCents +
        paymentSurchargeCents;

 const giftCardDeductionCents = appliedGiftCard
 ? Math.min(appliedGiftCard.balanceCents, preGiftTotalCents)
 : 0;

 const finalTotalCents = Math.max(0, preGiftTotalCents - giftCardDeductionCents);
 const installmentOptions = calculateInstallmentOptions(finalTotalCents);
 const activeInstallmentOption = installmentOptions.find((o) => o.number === selectedInstallment);
 const checkoutTotalCents =
 formData.paymentMethod === "credit_card" && activeInstallmentOption
 ? activeInstallmentOption.totalCents
 : finalTotalCents;

 const handleApplyPromo = async () => {
 if (!promoCode.trim()) return;
 setIsApplyingPromo(true);
 try {
 const codeUpper = promoCode.toUpperCase().trim();
 const res = await applyCouponToCart({ data: { code: codeUpper } });
 if (res && (!("status" in res) || (res as any).status !== "error")) {
 toast.success((res as any).message || "Cupom aplicado!");
 setPromoCode("");
 setAppliedGiftCard(null);
 router.invalidate();
 return;
 }

 const gcRes = await checkGiftCardBalance({ data: { code: promoCode.trim() } });
 if (gcRes && gcRes.balanceCents > 0) {
 setAppliedGiftCard({
 code: promoCode.trim(),
 balanceCents: gcRes.balanceCents,
 });
 toast.success(`Vale-presente de ${formatMoney(gcRes.balanceCents)} aplicado!`);
 setPromoCode("");
 return;
 }

 const errorMessage =
 res && "status" in res && (res as any).status === "error"
 ? (res as any).message
 : "Cupom ou Vale-presente inválido.";
 toast.error(errorMessage);
 } catch (err: unknown) {
 toast.error(humanizeErrorMessage(err, "Código promocional ou vale-presente inválido."));
 } finally {
 setIsApplyingPromo(false);
 }
 };

   const handleSubmitOrder = async () => {
    if (isSubmitting) return;

    // V139: GPS Mismatch Verification (Anti-Fraud & Distance Warning)
    if (formData.shippingMethod !== "pickup" && !hasValidatedGpsMismatch) {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p),
              () => resolve(null),
              { timeout: 3500 }
            );
          });
          if (pos) {
            const gpsValidation = await validateDeliveryLocationGPS({
              data: {
                deviceLat: pos.coords.latitude,
                deviceLng: pos.coords.longitude,
                deliveryCity: formData.shippingAddress.city,
                deliveryState: formData.shippingAddress.state,
                maxAllowedThresholdKm: 35,
              },
            });
            if (gpsValidation.isMismatch) {
              setGpsMismatchDistanceKm(gpsValidation.distanceKm);
              setIsGpsMismatchModalOpen(true);
              return;
            }
          }
        } catch (gpsErr) {
          console.warn("[checkout] GPS mismatch check skipped:", gpsErr);
        }
      }
    }

 if (formData.shippingMethod !== "pickup") {
 const { zipcode, street, number, neighborhood, city, state } = formData.shippingAddress;
 if (!zipcode || !street || !number || !neighborhood || !city || !state) {
 toast.error("Preencha todos os campos obrigatórios do endereço de entrega.");
 setActiveStep(2);
 return;
 }

 if (!selectedRateId) {
 toast.error("Escolha uma opção de frete para entrega.");
 setActiveStep(2);
 return;
 }
 }

 if (formData.paymentMethod === "credit_card") {
 const { number, holderName, expiryDate, cvv } = creditCardData;
 if (!number || number.length < 15 || !holderName || !expiryDate || !cvv) {
 toast.error("Preencha todos os campos do Cartão de Crédito.");
 setActiveStep(3);
 return;
 }
 }

 if (!cart.id || !cart.items || cart.items.length === 0) {
 toast.error("Sua sacola está vazia.");
 return;
 }

 // Required custom checkout fields validation
 const storeCustomFields: any[] = storeProfile?.settings?.custom_checkout_fields || [];
 for (const f of storeCustomFields) {
 const fieldKey = f.label || f.id;
 if (f.required && (!customFieldValues[fieldKey] || String(customFieldValues[fieldKey]).trim() === "")) {
 toast.error(`Preencha o campo obrigatório: "${f.label || "Pergunta da Loja"}"`);
 return;
 }
 }

 setIsSubmitting(true);
 try {
       const metamorphicNicheMetadata: Record<string, any> = {
        niche: isTourismNiche ? "tourism" : isDigitalNiche ? "digital" : isServiceNiche ? "services" : "retail",
        ...(isTourismNiche ? {
          tripTitle: cart.items[0]?.productTitle || "Pacote de Viagem",
          departureDate: travelDepartureDate || undefined,
          returnDate: travelReturnDate || undefined,
          boardingPoint: travelBoardingPoint || "Balcão da Agência",
          passengers: passengers,
          specialRequests: travelSpecialRequests || undefined,
          voucherDelivery: "digital_immediate",
        } : {}),
        ...(isDigitalNiche ? {
          deliveryEmail: formData.customerEmail,
          deliveryPhone: formData.customerPhone,
          digitalAccessType: "instant_voucher",
        } : {}),
        ...(isServiceNiche ? {
          serviceDate: serviceDate || undefined,
          serviceTimeSlot: serviceTimeSlot || undefined,
          serviceLocationType: serviceLocationType,
        } : {}),
        utensilsRequested: utensilsRequested,
      };

      const res = await processCheckout({
        data: {
          cartId: cart.id,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          customerDocument: formData.customerDocument,
          shippingMethod: isPhysicalDelivery ? formData.shippingMethod : "pickup",
          shippingAddress:
            (!isPhysicalDelivery || formData.shippingMethod === "pickup") ? undefined : formData.shippingAddress,
          paymentMethod: formData.paymentMethod,
          paymentMethodId:
            formData.paymentMethod === "manual" ? formData.paymentMethodId : undefined,
          giftCardCode: appliedGiftCard?.code || undefined,
          customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
          notes: orderNotes.trim() || undefined,
          deliveryToDoor: isPhysicalDelivery ? deliveryToDoor : false,
          doorDeliveryFeeCents: (isPhysicalDelivery && deliveryToDoor) ? doorDeliveryFeeCents : 0,
          deliveryLocationType: isPhysicalDelivery ? (deliveryToDoor ? "apartment_door" : "apartment_reception") : undefined,
          cpfOnReceipt: cpfRequested ? { requested: true, document: cpfDocument.trim() } : { requested: false },
          substitutionPolicy: substitutionPolicy,
          orderBump: isOrderBumpAccepted && orderBumpOffer ? {
            ruleId: orderBumpOffer.ruleId,
            productId: orderBumpOffer.productId,
            variantId: orderBumpOffer.variantId,
            offerPriceCents: orderBumpOffer.offerPriceCents,
            title: orderBumpOffer.title,
          } : undefined,
          receiverInfo: receiverMode === "other"
            ? { isOtherPerson: true, name: receiverName.trim(), phone: receiverPhone.trim() }
            : { isOtherPerson: false },
          utensilsRequested: utensilsRequested,
          itemNotes: Object.keys(itemNotes).length > 0 ? itemNotes : undefined,
          checkoutNicheMetadata: metamorphicNicheMetadata,
        },
      });

 if ((res as any)?.status === "error") {
 throw new Error((res as any)?.message || "Não foi possível finalizar o pedido.");
 }

 if (
 formData.shippingMethod !== "manual_quote" &&
 formData.paymentMethod !== "manual" &&
 checkoutTotalCents > 0
 ) {
 try {
 await initiatePaymentTransaction({
 data: {
 orderId: (res as any).orderId || (res as any).orderToken,
 publicToken: (res as any).orderToken as string,
 method: formData.paymentMethod === "credit_card" ? "credit_card" : "pix",
 amountCents: checkoutTotalCents,
 },
 });
 } catch (payErr: unknown) {
 console.warn("Transação de gateway:", payErr);
 toast.error("Instabilidade temporária no gateway. Consulte o status no seu pedido.");
 }
 }

 const humanOrderDisplay = (res as any)?.shortId ? `#${(res as any).shortId} ` : "";
	toast.success(`Pedido ${humanOrderDisplay}confirmado`);
 await refreshCart().catch(() => {});

 const remainingCarts = globalCarts.filter((c: any) => c.id !== cart.id);
 if (remainingCarts.length > 0) {
 toast.info(`Mais ${remainingCarts.length} pedido(s) pendente(s)`);
 navigate({ to: "/checkout" });
 } else {
 navigate({
 to: "/pedido/$publicToken/confirmacao",
 params: { publicToken: (res as any).orderToken as string },
 });
 }
 } catch (err: unknown) {
 toast.error(humanizeErrorMessage(err, "Não foi possível finalizar seu pedido no momento. Tente novamente em instantes."));
 } finally {
 setIsSubmitting(false);
 }
 };

 // Check if store is supermarket/mercado niche
 const isMarketNiche =
 storeProfile?.type === "mercado" ||
 storeProfile?.type === "supermercado" ||
 storeProfile?.type === "hortifruti";

 // Check custom delivery windows configured by store
 const storeDeliveryWindows: any[] = storeProfile?.settings?.delivery_windows || [];

 // Steps definition for Menu Tabs (Metamórfico por Nicho)
  const step2Label = isTourismNiche
    ? "Passageiros e Reserva"
    : isDigitalNiche
    ? "Envio Digital"
    : isServiceNiche
    ? "Agendamento"
    : "Entrega / Retirada";

  const isStep2Ready = isTourismNiche
    ? Boolean(passengers.length > 0 && passengers[0]?.name && passengers[0]?.document)
    : isDigitalNiche
    ? Boolean(formData.customerEmail)
    : isServiceNiche
    ? Boolean(serviceDate)
    : Boolean(formData.shippingMethod === "pickup" || selectedRateId);

  const steps = [
    { number: 1, label: "Identificação", isReady: Boolean(formData.customerName && formData.customerEmail && formData.customerPhone) },
    { number: 2, label: step2Label, isReady: isStep2Ready },
    { number: 3, label: "Pagamento", isReady: Boolean(formData.paymentMethod) },
    { number: 4, label: isTourismNiche ? "Revisão e Voucher" : "Revisão", isReady: true },
  ];

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto py-16 text-center space-y-6 px-0 sm:px-4">
 <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <ShoppingBag className="size-8" strokeWidth={1.5} />
 </div>
 <div className="space-y-1">
 <h2 className="text-xl font-bold text-foreground">Sua sacola está vazia</h2>
 <p className="text-xs text-muted-foreground">
 Explore as lojas e produtos locais para adicionar itens.
 </p>
 </div>
 <Button asChild className="rounded-lg px-6 h-10 font-bold text-xs">
 <Link to="/">Explorar Produtos</Link>
 </Button>
 </div>
 );
 }

  return (
    <div className="w-full max-w-5xl mx-auto pb-32 sm:pb-16 space-y-6 px-0 sm:px-4 md:px-0 pt-4 sm:pt-0">
  {/* ── Sub-Header Clean (Silêncio Operacional) ── */}
 <div className="flex items-center justify-between gap-4 pb-2">
 <div className="flex items-center gap-3">
 <Link
 to="/"
 className="size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
 aria-label="Voltar"
 >
 <ArrowLeft className="size-5" />
 </Link>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-foreground">
 {storeProfile?.name || "Checkout Seguro"}
 </span>
 {storeProfile?.type && (
 <span className="text-xs font-semibold text-muted-foreground uppercase">
 • {storeProfile.type}
 </span>
 )}
 </div>
 </div>
 </div>

 <span className="text-xs text-muted-foreground font-medium">
 {cart.items.length} {cart.items.length === 1 ? "item" : "itens"}
 </span>
 </div>

          
        {/* ── Omni-Checkout Multi-Loja: Seletor de Lojas com Carrinho Aberto (V141) ── */}
        {globalCarts && globalCarts.length > 1 && (
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Store className="size-3.5 text-primary" />
                <span>Omni-Checkout: Pedidos Segregados por Loja ({globalCarts.length} lojas)</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Cada loja possui frete e pedido independentes
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {globalCarts.map((c: any) => {
                const isCurrentStore = c.storeId === ((cart as any)?.storeId || storeProfile?.id);
                return (
                  <div
                    key={c.storeId || c.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-xs min-w-52 shrink-0 transition-colors",
                      isCurrentStore
                        ? "bg-card border-foreground/30 shadow-2xs"
                        : "bg-muted/40 border-border/60 opacity-80 hover:opacity-100"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-xs">
                        {c.storeName || "Loja"}
                      </p>
                      <p className="text-xs text-muted-foreground/75 text-muted-foreground font-mono">
                        {c.items?.length || 0} itens · {formatMoney(c.subtotalCents || 0)}
                      </p>
                    </div>
                    {isCurrentStore ? (
                      <Badge variant="default" className="text-xs text-muted-foreground/75 font-mono h-6 shrink-0">
                        Ativa
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/checkout", search: { store: c.storeId } })}
                        className="h-6 text-xs text-muted-foreground/75 font-bold rounded-lg px-2"
                      >
                        Finalizar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MENU TABS DE ETAPAS (Ultra-Minimalista: Tipografia & Linha Fina) ── */}
          <div className="w-full overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-6 min-w-max border-b border-border/40 pb-2">
              {steps.map((step) => {
                const isActive = activeStep === step.number;
                const isCompleted = activeStep > step.number || (step.number < activeStep && step.isReady);
                const canNavigate = step.number < activeStep || step.isReady;

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => canNavigate && setActiveStep(step.number)}
                    disabled={!canNavigate}
                    className={cn(
                      "flex items-center gap-2 pb-1 text-xs transition-colors select-none cursor-pointer border-b-2 -mb-px",
                      isActive
                        ? "border-foreground font-bold text-foreground"
                        : isCompleted
                        ? "border-transparent text-foreground hover:text-foreground font-medium"
                        : "border-transparent text-muted-foreground/60 cursor-not-allowed font-normal"
                    )}
                  >
                    <span className={cn("font-mono text-xs", isCompleted ? "text-emerald-600 dark:text-emerald-400 font-bold" : "")}>
                      {isCompleted ? "" : `${step.number}.`}
                    </span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        {/* ── CORPO PRINCIPAL (Etapa Ativa + Resumo Lateral) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
 {/* Coluna da Esquerda: Etapa Ativa */}
 <div className="lg:col-span-2 space-y-6">
 {/* ── ETAPA 1: IDENTIFICAÇÃO DO CLIENTE ── */}
 {activeStep === 1 && (
 <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-5">
 {/* Zero-Amnesia: Card de Identificação Confirmada */}
          {userProfile && userProfile.fullName && userProfile.email && !isEditingContact ? (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {(userProfile.fullName || userProfile.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{formData.customerName || userProfile.fullName}</p>
                    <Badge variant="secondary" className="text-xs text-muted-foreground/75 px-2 py-0 font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                      Confirmado 
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formData.customerEmail || userProfile.email} {formData.customerPhone ? `• ${formData.customerPhone}` : ""}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingContact(true)}
                className="text-xs font-semibold h-8 rounded-lg cursor-pointer self-start sm:self-auto"
              >
                Alterar dados
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userProfile && isEditingContact && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-foreground">Editar Dados de Contato</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-bold text-foreground">Nome Completo *</Label>
                  <Input
                    required
                    placeholder="Seu nome completo"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="h-11 rounded-lg text-base sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">E-mail *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="h-11 rounded-lg text-base sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">WhatsApp / Telefone *</Label>
                  <PhoneField
                    required
                    value={formData.customerPhone}
                    onChange={(val) => setFormData({ ...formData, customerPhone: val || "" })}
                    className="h-11 rounded-lg text-base sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

                {/* ── Fiscal & Notas: CPF na Nota ── */}
                {checkoutConfig?.cpfOnReceipt?.enabled !== false && (
                  <div className="sm:col-span-2 space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground">
                          {checkoutConfig?.cpfOnReceipt?.label || "Deseja CPF na Nota Fiscal?"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Emissão oficial do cupom fiscal com seu documento
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCpfRequested(true);
                            if (userProfile?.cpf && !cpfDocument) setCpfDocument(userProfile.cpf);
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                            cpfRequested
                              ? "border-foreground text-foreground font-bold"
                              : "border-border/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setCpfRequested(false)}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                            !cpfRequested
                              ? "border-foreground text-foreground font-bold"
                              : "border-border/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Não
                        </button>
                      </div>
                    </div>

                    {cpfRequested && (
                      <div className="pt-2 animate-in fade-in duration-150">
                        <DocumentField
                          mode="dynamic"
                          value={cpfDocument}
                          onChange={(masked, _isValid, clean) => {
                            const val = clean || masked;
                            setCpfDocument(val);
                            setFormData((prev) => ({ ...prev, customerDocument: val }));
                          }}
                          placeholder="Digite seu CPF para emissão da nota"
                          className="h-11 rounded-lg text-base sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Perguntas e Campos Customizados do Nicho / Loja ── */}
                {storeProfile?.settings?.custom_checkout_fields &&
                  Array.isArray(storeProfile.settings.custom_checkout_fields) &&
                  storeProfile.settings.custom_checkout_fields.length > 0 && (
                    <div className="sm:col-span-2 space-y-3 pt-3 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground">
                          Informações Complementares ({storeProfile.name})
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Dados necessários para a emissão e processamento deste pedido.
                        </p>
                      </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {storeProfile.settings.custom_checkout_fields.map((f: any) => {
 const fieldKey = f.label || f.id;
 return (
 <div
 key={f.id}
 className={cn(
 "space-y-2",
 f.type === "textarea" ? "sm:col-span-2" : ""
 )}
 >
 <Label className="text-xs font-semibold text-foreground">
 {f.label || "Pergunta da Loja"} {f.required && <span className="text-destructive">*</span>}
 </Label>

 {f.type === "textarea" ? (
 <textarea
 value={customFieldValues[fieldKey] || ""}
 onChange={(e) =>
 setCustomFieldValues((prev) => ({
 ...prev,
 [fieldKey]: e.target.value,
 }))
 }
 placeholder={f.placeholder || "Digite sua resposta..."}
 rows={2}
 required={f.required}
 className="w-full rounded-lg border border-input bg-card p-3 text-base sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-20"
 />
 ) : (
 <Input
 type={f.type || "text"}
 value={customFieldValues[fieldKey] || ""}
 onChange={(e) =>
 setCustomFieldValues((prev) => ({
 ...prev,
 [fieldKey]: e.target.value,
 }))
 }
 placeholder={f.placeholder || "Digite sua resposta..."}
 required={f.required}
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Observações Gerais do Pedido */}
 <div className="sm:col-span-2 space-y-2 pt-2">
 <Label className="text-xs font-semibold text-muted-foreground">
 Observações do Pedido (Opcional)
 </Label>
 <Input
 placeholder="Instruções especiais ou ponto de referência..."
 value={orderNotes}
 onChange={(e) => setOrderNotes(e.target.value)}
 className="h-11 rounded-lg text-base sm:text-sm"
  />
  </div>

  <div className="pt-3 flex justify-end">
 <Button
 onClick={handleAdvanceToDelivery}
 disabled={!formData.customerName || !formData.customerEmail || !formData.customerPhone}
 className="rounded-lg px-6 h-11 w-full sm:w-auto font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all"
 >
 <span>{isTourismNiche ? "Continuar para Passageiros e Reserva" : isDigitalNiche ? "Continuar para Envio Digital" : isServiceNiche ? "Continuar para Agendamento" : "Continuar para Entrega"}</span>
 <ChevronRight size={15} className="ml-1" />
 </Button>
 </div>
 </Surface>
 )}

 {/* ── ETAPA 2: RESERVA DE TURISMO & MANIFESTO DE PASSAGEIROS ── */}
        {activeStep === 2 && isTourismNiche && (
          <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Plane size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Reserva de Viagem & Turismo</h3>
                  <p className="text-xs text-muted-foreground">Emissão de Voucher Digital com validade legal Embratur e Cadastur</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-2 w-fit">
                <Sparkles size={12} /> Frete Isento (Voucher Digital)
              </Badge>
            </div>

            {/* Pacote Selecionado */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Pacote / Destino Confirmado
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  {cart.items[0]?.productTitle || "Pacote de Viagem Oficial"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {storeProfile?.name || "Agência de Viagens Credenciada"}
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-mono text-muted-foreground block">Total do Pacote</span>
                <span className="text-base font-black font-mono text-foreground">{formatMoney(cart.subtotalCents)}</span>
              </div>
            </div>

            {/* Datas da Viagem & Embarque */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Calendar size={14} className="text-primary" /> Datas da Viagem & Ponto de Embarque
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Data de Saída / Check-in *</label>
                  <Input
                    type="date"
                    value={travelDepartureDate}
                    onChange={(e) => setTravelDepartureDate(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Data de Retorno / Check-out</label>
                  <Input
                    type="date"
                    value={travelReturnDate}
                    onChange={(e) => setTravelReturnDate(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Ponto de Embarque / Saída</label>
                  <Input
                    type="text"
                    placeholder="Ex: Aeroporto, Balcão da Agência, Terminal"
                    value={travelBoardingPoint}
                    onChange={(e) => setTravelBoardingPoint(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Manifesto de Passageiros */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Users size={14} className="text-primary" /> Manifesto de Passageiros e Viajantes ({passengers.length} {passengers.length === 1 ? "vaga" : "vagas"})
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Cada passageiro adicionado garante uma vaga confirmada. O valor total se ajusta automaticamente ({passengers.length}x).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPassengers((prev) => [
                      ...prev,
                      {
                        id: `p-${Date.now()}`,
                        name: "",
                        document: "",
                        birthDate: "",
                        phone: "",
                        isLead: false,
                      },
                    ]);
                  }}
                  className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                >
                  <Plus size={13} /> Adicionar Passageiro
                </Button>
              </div>

              <div className="space-y-3">
                {passengers.map((p, idx) => (
                  <div key={p.id} className="p-4 rounded-lg bg-card border border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <span className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {p.isLead ? "Passageiro Titular (Contratante)" : `Acompanhante ${idx}`}
                      </span>
                      {!p.isLead && (
                        <button
                          type="button"
                          onClick={() => setPassengers((prev) => prev.filter((item) => item.id !== p.id))}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer"
                          title="Remover passageiro"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Nome Completo *</label>
                        <Input
                          placeholder="Nome conforme documento"
                          value={p.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassengers((prev) => prev.map((item) => (item.id === p.id ? { ...item, name: val } : item)));
                          }}
                          className="h-11 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">CPF / Passaporte *</label>
                        <Input
                          placeholder="Documento oficial"
                          value={p.document}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassengers((prev) => prev.map((item) => (item.id === p.id ? { ...item, document: val } : item)));
                          }}
                          className="h-11 rounded-lg text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Data de Nascimento</label>
                        <Input
                          type="date"
                          value={p.birthDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassengers((prev) => prev.map((item) => (item.id === p.id ? { ...item, birthDate: val } : item)));
                          }}
                          className="h-11 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferências e Solicitações Especiais */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-foreground">Solicitações Especiais ou Preferências de Hospedagem</Label>
              <Input
                placeholder="Ex: Cama de casal, preferências alimentares, quarto silencioso, acessibilidade..."
                value={travelSpecialRequests}
                onChange={(e) => setTravelSpecialRequests(e.target.value)}
                className="h-11 rounded-lg text-xs"
              />
            </div>

            {/* Selo de Garantia do Voucher */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">Emissão Garantida de Voucher Oficial</p>
                <p className="text-muted-foreground leading-relaxed">
                  Ao finalizar a compra, seu Voucher Digital com QR Code de embarque e número de reserva será emitido imediatamente. Os dados dos passageiros serão anexados ao contrato da viagem.
                </p>
              </div>
            </div>

            {/* Navegação da Etapa 2 Turismo */}
            {/* ── Order Bump: Oferta Relâmpago de 1-Clique ── */}
        {orderBumpOffer && (
          <div
            className={cn(
              "p-4 rounded-lg border transition-all space-y-3 cursor-pointer select-none",
              isOrderBumpAccepted
                ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30"
                : "bg-muted/20 border-dashed border-border/80 hover:border-border"
            )}
            onClick={() => setIsOrderBumpAccepted(!isOrderBumpAccepted)}
          >
            <div className="flex items-start gap-3">
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={isOrderBumpAccepted}
                  onChange={(e) => setIsOrderBumpAccepted(e.target.checked)}
                  className="size-5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {orderBumpOffer.coverUrl && (
                <img
                  src={orderBumpOffer.coverUrl}
                  alt={orderBumpOffer.title}
                  className="size-12 rounded-lg object-cover border border-border/40 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    {orderBumpOffer.discountPercentage > 0 ? `${orderBumpOffer.discountPercentage}% OFF` : "Exclusivo"}
                  </Badge>
                  <span className="text-xs font-bold text-foreground">
                    {orderBumpOffer.headline}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 font-medium mt-1">
                  {orderBumpOffer.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {orderBumpOffer.originalPriceCents > orderBumpOffer.offerPriceCents && (
                    <span className="text-xs text-muted-foreground line-through font-mono">
                      {formatMoney(orderBumpOffer.originalPriceCents)}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatMoney(orderBumpOffer.offerPriceCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveStep(1)}
                className="rounded-lg px-5 h-11 font-bold text-xs sm:text-sm"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setActiveStep(3)}
                disabled={!passengers[0]?.name || !passengers[0]?.document}
                className="rounded-lg px-6 h-11 font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all flex items-center gap-2"
              >
                <span>Ir para Pagamento</span>
                <ChevronRight size={15} />
              </Button>
            </div>
          </Surface>
        )}

        {/* ── ETAPA 2: ENVIO DIGITAL INSTANTÂNEO ── */}
        {activeStep === 2 && isDigitalNiche && (
          <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Envio Digital Instantâneo</h3>
                  <p className="text-xs text-muted-foreground">Produto 100% digital com liberação imediata via e-mail e app</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-2 w-fit">
                Frete Isento (R$ 0,00)
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Destinatário dos Acessos
              </span>
              <p className="text-xs text-foreground font-semibold">
                E-mail de Envio: <span className="font-mono text-primary">{formData.customerEmail || "Não informado"}</span>
              </p>
              {formData.customerPhone && (
                <p className="text-xs text-foreground font-semibold">
                  WhatsApp para Chave / Voucher: <span className="font-mono text-primary">{formData.customerPhone}</span>
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">Liberação Automática Pós-Pagamento</p>
                <p className="text-muted-foreground leading-relaxed">
                  Assim que o pagamento for compensado, os links de download e credenciais de acesso serão liberados na sua conta Waesy e enviados para o seu e-mail.
                </p>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveStep(1)}
                className="rounded-lg px-5 h-11 font-bold text-xs sm:text-sm"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setActiveStep(3)}
                disabled={!formData.customerEmail}
                className="rounded-lg px-6 h-11 font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all flex items-center gap-2"
              >
                <span>Ir para Pagamento</span>
                <ChevronRight size={15} />
              </Button>
            </div>
          </Surface>
        )}

        {/* ── ETAPA 2: AGENDAMENTO DE SERVIÇO ── */}
        {activeStep === 2 && isServiceNiche && (
          <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Agendamento do Serviço</h3>
                  <p className="text-xs text-muted-foreground">Escolha a data e local de atendimento</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 gap-2 w-fit">
                Atendimento Profissional
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Data do Atendimento *</label>
                <Input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="h-11 rounded-lg text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Horário / Turno de Preferência</label>
                <Input
                  type="text"
                  placeholder="Ex: 14:00, Manhã, Tarde"
                  value={serviceTimeSlot}
                  onChange={(e) => setServiceTimeSlot(e.target.value)}
                  className="h-11 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Local do Atendimento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setServiceLocationType("store")}
                  className={cn(
                    "p-3 rounded-lg border text-left text-xs transition-all cursor-pointer",
                    serviceLocationType === "store"
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-card border-border text-foreground hover:bg-muted/40"
                  )}
                >
                  <p className="font-bold">No Estabelecimento</p>
                  <p className={cn("text-xs", serviceLocationType === "store" ? "text-background/80" : "text-muted-foreground")}>
                    {storeProfile?.address || "Endereço da Empresa"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceLocationType("home")}
                  className={cn(
                    "p-3 rounded-lg border text-left text-xs transition-all cursor-pointer",
                    serviceLocationType === "home"
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-card border-border text-foreground hover:bg-muted/40"
                  )}
                >
                  <p className="font-bold">Em Domicílio</p>
                  <p className={cn("text-xs", serviceLocationType === "home" ? "text-background/80" : "text-muted-foreground")}>
                    Atendimento no endereço do cliente
                  </p>
                </button>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveStep(1)}
                className="rounded-lg px-5 h-11 font-bold text-xs sm:text-sm"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setActiveStep(3)}
                disabled={!serviceDate}
                className="rounded-lg px-6 h-11 font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all flex items-center gap-2"
              >
                <span>Ir para Pagamento</span>
                <ChevronRight size={15} />
              </Button>
            </div>
          </Surface>
        )}

        {/* ── ETAPA 2: ENTREGA FÍSICA OU RETIRADA ── */}
        {activeStep === 2 && isPhysicalDelivery && (
 <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-5">
 {/* Seletor de Modalidade: Entrega vs Retirada */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setFormData({ ...formData, shippingMethod: "manual_table" })}
 className={cn(
 "p-4 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer",
 formData.shippingMethod !== "pickup"
 ? "bg-foreground text-background border-foreground font-bold"
 : "bg-card border-border/80 text-foreground hover:bg-muted/40"
 )}
 >
 <Truck size={20} className={formData.shippingMethod !== "pickup" ? "text-background" : "text-muted-foreground"} />
 <div>
 <p className="text-xs font-bold">Entrega no Endereço</p>
 <p className={cn("text-xs text-muted-foreground/75", formData.shippingMethod !== "pickup" ? "text-background/80" : "text-muted-foreground")}>
 Receba em casa ou trabalho
 </p>
 </div>
 </button>

 <button
 type="button"
 onClick={handleSelectPickup}
 className={cn(
 "p-4 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer",
 formData.shippingMethod === "pickup"
 ? "bg-foreground text-background border-foreground font-bold"
 : "bg-card border-border/80 text-foreground hover:bg-muted/40"
 )}
 >
 <Store size={20} className={formData.shippingMethod === "pickup" ? "text-background" : "text-muted-foreground"} />
 <div>
 <p className="text-xs font-bold">Retirar na Loja</p>
 <p className={cn("text-xs text-muted-foreground/75", formData.shippingMethod === "pickup" ? "text-background/80" : "text-muted-foreground")}>
 Grátis no balcão
 </p>
 </div>
 </button>
 </div>

 {/* Opção 1: Entrega no Endereço */}
 {formData.shippingMethod !== "pickup" ? (
 <div className="space-y-4 pt-1">
 {/* Endereços Salvos do Usuário */}
 {userAddresses && userAddresses.length > 0 && !showNewAddressForm && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <MapPin size={13} className="text-primary" /> Meus Endereços Salvos
 </Label>
 <button
 type="button"
 onClick={() => setShowNewAddressForm(true)}
 className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
 >
 <Plus size={12} /> Outro Endereço
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {userAddresses.map((addr: any) => {
 const cleanZip = (addr.zipcode || "").replace(/\D/g, "");
 const isSelected =
 formData.shippingAddress.zipcode === cleanZip &&
 formData.shippingAddress.number === addr.number;

 return (
 <button
 key={addr.id}
 type="button"
 onClick={() => {
 setFormData((prev) => ({
 ...prev,
 shippingAddress: {
 zipcode: cleanZip,
 street: addr.street || addr.address_line1 || "",
 number: addr.number || "",
 complement: addr.complement || "",
 neighborhood: addr.neighborhood || addr.bairro || "",
 city: addr.city || "",
 state: addr.state || "",
 },
 }));
 handleCepChange(cleanZip, true);
 }}
 className={cn(
 "p-3 rounded-lg border text-left text-xs transition-all cursor-pointer space-y-1",
 isSelected
 ? "border-primary bg-primary/5 ring-1 ring-primary font-medium"
 : "bg-card border-border/80 hover:bg-muted/40"
 )}
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground truncate">
 {addr.street || "Rua"}, {addr.number}
 </span>
 {addr.is_default && (
 <Badge variant="secondary" className="text-xs font-bold px-2 py-0">
 Padrão
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground truncate">
 {addr.neighborhood} - {addr.city}/{addr.state}
 </p>
 <p className="font-mono text-xs text-muted-foreground/75 text-muted-foreground">{addr.zipcode}</p>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* Formulário de Endereço (Novo ou Editável) */}
 {(showNewAddressForm || !userAddresses || userAddresses.length === 0) && (
 <div className="p-4 rounded-lg bg-muted/20 space-y-4">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">Endereço de Entrega</Label>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleGPSLocation}
 disabled={isLocatingGPS}
 className="rounded-lg h-7 px-3 text-xs font-bold gap-1 cursor-pointer"
 >
 {isLocatingGPS ? (
 <Loader2 size={12} className="animate-spin text-primary" />
 ) : (
 <Navigation size={12} className="text-primary" />
 )}
 <span>Puxar via GPS</span>
 </Button>
 {userAddresses && userAddresses.length > 0 && (
 <button
 type="button"
 onClick={() => setShowNewAddressForm(false)}
 className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
 >
 Cancelar
 </button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">CEP *</Label>
 <CepField
 value={formData.shippingAddress.zipcode}
 onChange={(masked, clean) => {
 handleCepChange(clean);
 }}
 onAddressFound={(addr) => {
 setFormData((prev) => ({
 ...prev,
 shippingAddress: {
 ...prev.shippingAddress,
 street: addr.street || prev.shippingAddress.street,
 neighborhood: addr.neighborhood || prev.shippingAddress.neighborhood,
 city: addr.city || prev.shippingAddress.city,
 state: addr.state || prev.shippingAddress.state,
 },
 }));
 }}
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <Label className="text-xs font-bold text-muted-foreground">Rua / Avenida *</Label>
 <Input
 placeholder="Nome da rua"
 value={formData.shippingAddress.street}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, street: e.target.value },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Número *</Label>
 <Input
 placeholder="123"
 value={formData.shippingAddress.number}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, number: e.target.value },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <Label className="text-xs font-bold text-muted-foreground">Complemento</Label>
 <Input
 placeholder="Apto, bloco, etc."
 value={formData.shippingAddress.complement}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, complement: e.target.value },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Bairro *</Label>
 <Input
 placeholder="Bairro"
 value={formData.shippingAddress.neighborhood}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, neighborhood: e.target.value },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Cidade *</Label>
 <Input
 placeholder="Cidade"
 value={formData.shippingAddress.city}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, city: e.target.value },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">UF *</Label>
 <Input
 placeholder="SC"
 maxLength={2}
 value={formData.shippingAddress.state}
 onChange={(e) =>
 setFormData({
 ...formData,
 shippingAddress: { ...formData.shippingAddress, state: e.target.value.toUpperCase() },
 })
 }
 className="h-11 rounded-lg text-base sm:text-sm uppercase"
 />
 </div>
 </div>
 </div>
 )}

 {/* Seleção de Taxas e Opções de Frete */}
 <div className="space-y-2 pt-2">
 <Label className="text-xs font-bold text-foreground">Opções de Frete Disponíveis</Label>
 {isCalculatingShipping ? (
 <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
 <Loader2 className="animate-spin size-4 text-primary" />
 <span>Calculando opções de entrega...</span>
 </div>
 ) : shippingRates.length > 0 ? (
 <div className="grid gap-2">
 {shippingRates.map((rate, idx) => {
 const rateKey = rate.id || rate.service_name || rate.name || `rate-${idx}`;
 const rateName = rate.name || rate.service_name || "Entrega Expressa";
 const isSelected = selectedRateId === rateKey;
 return (
 <button
 key={rateKey}
 type="button"
 onClick={() => handleSelectRate({ ...rate, id: rateKey, name: rateName })}
 className={cn(
 "flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer",
 isSelected
 ? "border-primary bg-primary/5 ring-1 ring-primary font-medium"
 : "bg-card border-border/80 hover:bg-muted/40"
 )}
 >
 <div className="space-y-1">
 <p className="font-bold text-xs text-foreground">{rateName}</p>
 {rate.notice && (
 <p className="text-xs text-muted-foreground/75 font-medium text-amber-600 dark:text-amber-400">
 {rate.notice}
 </p>
 )}
 {rate.estimated_days !== undefined && (
 <p className="text-xs text-muted-foreground/75 text-muted-foreground">
 Previsão: {rate.estimated_days === 0 ? "Hoje (Expressa)" : `${rate.estimated_days} ${rate.estimated_days === 1 ? "dia útil" : "dias úteis"}`}
 </p>
 )}
 </div>
 <span className="font-mono font-bold text-xs text-foreground">
 {formatMoney(rate.price_cents)}
 </span>
 </button>
 );
 })}
 </div>
 ) : noShippingRatesFound ? (
 <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
 Nenhuma tabela fixa automática encontrada para este CEP. A entrega será combinada diretamente com a loja.
 </div>
 ) : (
 <p className="text-xs text-muted-foreground">
 Informe o CEP para carregar os valores de entrega.
 </p>
 )}
 </div>

 {/* Janelas de Entrega (Apenas se a loja tiver configurado turnos) */}
 {storeDeliveryWindows.length > 0 && (
 <div className="space-y-2 pt-2">
 <Label className="text-xs font-bold text-foreground">
 Horário Preferencial da Entrega
 </Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {storeDeliveryWindows.map((slot: any) => {
 const isSelected = formData.deliverySlot === slot.id;
 return (
 <button
 key={slot.id}
 type="button"
 onClick={() => setFormData({ ...formData, deliverySlot: slot.id })}
 className={cn(
 "p-3 rounded-lg border text-left transition-all cursor-pointer",
 isSelected
 ? "border-foreground bg-muted/20 font-bold"
 : "border-border/60 hover:border-foreground/30"
 )}
 >
 <p className="font-bold text-xs text-foreground">{slot.label}</p>
 {slot.sub && <p className="text-xs text-muted-foreground/75 text-muted-foreground">{slot.sub}</p>}
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* ── Motor Waesy Go & Logística de Precisão (Entrega na Porta / Apartamento) ── */}
            <div className="pt-3 border-t border-border/40 space-y-3">
              <div className="flex items-start justify-between gap-3 p-4 rounded-lg bg-card border border-border/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Entregar na porta de casa / apartamento</span>
                    <Badge variant="outline" className="text-xs text-muted-foreground/75 font-mono font-bold text-primary border-primary/30">
                      +{formatMoney(doorDeliveryFeeCents)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O entregador sobe até o apartamento ou entra no condomínio para entregar diretamente na sua porta.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPolicySheetOpen(true)}
                    className="text-xs text-muted-foreground/75 text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="size-3" /> Ver Políticas Pétreas de Entrega
                  </button>
                </div>
                <input
                  type="checkbox"
                  checked={deliveryToDoor}
                  onChange={(e) => setDeliveryToDoor(e.target.checked)}
                  className="size-5 rounded-md border-border text-primary focus:ring-primary mt-1 cursor-pointer"
                />
              </div>

              {deliveryToDoor && (
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Bloco / Torre / Edifício</Label>
                      <Input
                        placeholder="Ex: Bloco B, Torre 2"
                        value={apartmentDetails.blockTower}
                        onChange={(e) => setApartmentDetails((prev) => ({ ...prev, blockTower: e.target.value }))}
                        className="h-10 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Código de Acesso / Interfone</Label>
                      <Input
                        placeholder="Ex: Interfone 402, Ramal 12"
                        value={apartmentDetails.intercomCode}
                        onChange={(e) => setApartmentDetails((prev) => ({ ...prev, intercomCode: e.target.value }))}
                        className="h-10 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/75 text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                    Aviso Pétreo: Caso as normas do condomínio impeçam a subida de entregadores, a entrega será finalizada na portaria e o valor da taxa não é reembolsado.
                  </p>
                </div>
              )}
            </div>

            {/* ── Logística e Recebimento: Quem recebe as compras ── */}
 {checkoutConfig?.receiverInfo?.enabled !== false && (
 <div className="pt-3 border-t border-border/40 space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">
 {checkoutConfig?.receiverInfo?.label || "Quem irá receber o pedido?"}
 </Label>
 <p className="text-xs text-muted-foreground">
 Ajuda o entregador ou portaria no momento da entrega
 </p>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setReceiverMode("self")}
 className={cn(
 "px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
 receiverMode === "self"
 ? "border-foreground text-foreground font-bold"
 : "border-border/60 text-muted-foreground hover:text-foreground"
 )}
 >
 Eu mesmo
 </button>
 <button
 type="button"
 onClick={() => setReceiverMode("other")}
 className={cn(
 "px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
 receiverMode === "other"
 ? "border-foreground text-foreground font-bold"
 : "border-border/60 text-muted-foreground hover:text-foreground"
 )}
 >
 Outra pessoa
 </button>
 </div>

 {receiverMode === "other" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-150">
 <Input
 placeholder="Nome de quem irá receber"
 value={receiverName}
 onChange={(e) => setReceiverName(e.target.value)}
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 <PhoneField
 placeholder="Telefone de quem irá receber"
 value={receiverPhone}
 onChange={(val) => setReceiverPhone(val || "")}
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>
 )}
 </div>
 )}

 {/* ── Política de Substituição (Supermercados / Alimentos) ── */}
 {(checkoutConfig?.substitutionPolicy?.enabled ?? isMarketNiche) && (
 <div className="pt-3 border-t border-border/40 space-y-2">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">
 Se algum item estiver em falta no mercado:
 </Label>
 <p className="text-xs text-muted-foreground">
 Como a equipe de separação da loja deve proceder
 </p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
 {[
 { id: "similar", label: "Trocar por similar", desc: "Mesma categoria" },
 { id: "contact", label: "Confirmar comigo", desc: "Via WhatsApp" },
 { id: "cancel", label: "Cancelar item", desc: "Abater do valor" },
 ].map((pol) => {
 const isSelected = substitutionPolicy === pol.id;
 return (
 <button
 key={pol.id}
 type="button"
 onClick={() => {
 setSubstitutionPolicy(pol.id as any);
 setFormData((prev) => ({ ...prev, substitutionPolicy: pol.id as any }));
 }}
 className={cn(
                          "p-3 rounded-lg border text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-emerald-600 bg-emerald-500/5 text-foreground font-semibold"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        <div className="text-xs font-semibold leading-tight">{pol.label}</div>
                        <div className="text-xs text-muted-foreground/75 text-muted-foreground mt-1">{pol.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Descartáveis & Talheres (Gastronomia / Food) ── */}
            {(checkoutConfig?.enableUtensilsOption ?? isFoodNiche) && (
              <div className="pt-3 border-t border-border/40 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">
                    Enviar talheres e guardanapos descartáveis?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ajude o meio ambiente caso já tenha talheres em seu local
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUtensilsRequested(true)}
                    className={cn(
                      "px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                      utensilsRequested
                        ? "border-foreground text-foreground font-bold"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sim, por favor
                  </button>
                  <button
                    type="button"
                    onClick={() => setUtensilsRequested(false)}
                    className={cn(
                      "px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                      !utensilsRequested
                        ? "border-foreground text-foreground font-bold"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Não precisa
                  </button>
                </div>
              </div>
            )}
 </div>
 ) : (
 /* Opção 2: Retirar na Loja */
 <div className="p-4 rounded-lg bg-muted/20 space-y-2">
 <p className="text-xs font-bold text-foreground">Endereço de Retirada:</p>
 <p className="text-xs text-muted-foreground">
 {storeProfile?.address
 ? `${storeProfile.address}, ${storeProfile.city || ""}`
 : "Endereço principal da loja informado no pedido"}
 </p>
 <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
  Custo de frete: R$ 0,00 (Retirada Grátis)
 </p>
 </div>
 )}

 <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
 <Button
 variant="outline"
 onClick={() => setActiveStep(1)}
 className="rounded-lg px-5 h-11 font-bold text-xs sm:text-sm"
 >
 Voltar
 </Button>
 <Button
 onClick={() => setActiveStep(3)}
 disabled={formData.shippingMethod !== "pickup" && !formData.shippingAddress.zipcode}
 className="rounded-lg px-6 h-11 font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all flex items-center gap-2"
 >
 <span>Ir para Pagamento</span>
 <ChevronRight size={15} />
 </Button>
 </div>
 </Surface>
 )}

 {/* ── ETAPA 3: FORMA DE PAGAMENTO ── */}
 {activeStep === 3 && (
 <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-5">
 <Label className="text-xs font-bold text-foreground">Escolha a Forma de Pagamento</Label>

 <div className="space-y-3">
 {/* 1. PIX */}
 <button
 type="button"
 onClick={() => setFormData({ ...formData, paymentMethod: "pix", paymentMethodId: "" })}
 className={cn(
 "w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
 formData.paymentMethod === "pix"
 ? "border-primary bg-primary/5 ring-1 ring-primary font-bold"
 : "bg-card border-border/80 hover:bg-muted/40"
 )}
 >
 <div className="flex items-center gap-3">
 <QrCode className="size-5 text-primary shrink-0" strokeWidth={1.75} />
 <div>
 <p className="text-xs font-bold text-foreground">
 {storeProfile?.settings?.payment_processing_mode === "direct_store"
 ? "PIX Direto para a Loja"
 : "PIX Instantâneo"}
 </p>
 <p className="text-xs text-muted-foreground">
 {storeProfile?.settings?.payment_processing_mode === "direct_store"
 ? (storeProfile?.settings?.pix_key
 ? `Chave Pix oficial: ${storeProfile.settings.pix_key}`
 : "Recebimento direto na chave Pix da empresa")
 : "Aprovação imediata com QR Code automático"}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {storeProfile?.settings?.payment_processing_mode === "direct_store" ? (
 <Badge variant="success">
 Direto da Loja
 </Badge>
 ) : null}
 {pixDiscountPercent > 0 && (
 <Badge variant="success">
 {pixDiscountPercent}% OFF
 </Badge>
 )}
 </div>
 </button>

 {formData.paymentMethod === "pix" &&
 storeProfile?.settings?.payment_processing_mode === "direct_store" &&
 storeProfile?.settings?.payment_instructions && (
 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1 animate-in fade-in-50">
 <span className="text-xs text-muted-foreground/75 font-bold uppercase text-foreground tracking-wider block">
 Instruções da Loja para Pagamento Pix:
 </span>
 <p className="text-foreground/90 leading-relaxed">
 {storeProfile.settings.payment_instructions}
 </p>
 </div>
 )}

 {/* 2. Cartão de Crédito Online (apenas se gateway ativo na plataforma ou configurado) */}
 {(isGatewayConfigured || storeProfile?.settings?.payment_processing_mode !== "direct_store") && (
 <>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, paymentMethod: "credit_card", paymentMethodId: "" })}
 className={cn(
 "w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
 formData.paymentMethod === "credit_card"
 ? "border-primary bg-primary/5 ring-1 ring-primary font-bold"
 : "bg-card border-border/80 hover:bg-muted/40"
 )}
 >
 <div className="flex items-center gap-3">
 <CreditCard className="size-5 text-primary shrink-0" strokeWidth={1.75} />
 <div>
 <p className="text-xs font-bold text-foreground">Cartão de Crédito Online</p>
 <p className="text-xs text-muted-foreground">
 Até {maxInstallments}x no cartão
 </p>
 </div>
 </div>
 </button>

 {formData.paymentMethod === "credit_card" && (
 <div className="p-4 rounded-lg bg-muted/20 space-y-4 animate-in fade-in-50">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Número do Cartão *</Label>
 <CreditCardNumberInput
 value={creditCardData.number}
 onChange={(formatted, _brand, clean) =>
 setCreditCardData({ ...creditCardData, number: clean || formatted })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Nome Impresso no Cartão *</Label>
 <Input
 placeholder="Como está gravado no cartão"
 value={creditCardData.holderName}
 onChange={(e) => setCreditCardData({ ...creditCardData, holderName: e.target.value.toUpperCase() })}
 className="h-11 rounded-lg text-base sm:text-sm uppercase"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Validade (MM/AA) *</Label>
 <CardExpiryInput
 value={creditCardData.expiryDate}
 onChange={(formatted) =>
 setCreditCardData({ ...creditCardData, expiryDate: formatted })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">CVV *</Label>
 <CardCvvInput
 value={creditCardData.cvv}
 onChange={(cvv) =>
 setCreditCardData({ ...creditCardData, cvv })
 }
 className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>
 </div>

 {installmentOptions.length > 0 && (
 <div className="space-y-1">
 <Label className="text-xs font-bold text-muted-foreground">Parcelamento</Label>
 <Select
 value={String(selectedInstallment)}
 onValueChange={(v) => setSelectedInstallment(Number(v))}
 >
 <SelectTrigger className="h-11 rounded-lg text-base sm:text-sm">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {installmentOptions.map((opt) => (
 <SelectItem key={opt.number} value={String(opt.number)}>
 {opt.formattedText}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}
 </div>
 )}
 </>
 )}

 {/* 3. Pagamento na Entrega / Manual (se configurado pela loja) */}
 {(() => {
 const seenNames = new Set<string>();
 const deduplicatedManualMethods = (paymentMethods || []).filter((pm: any) => {
 const norm = (pm.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
 if (!norm) return false;
 if (norm.includes("pix")) return false;
 const isOnlineCard = norm.includes("credito") || norm.includes("credit card") || norm === "cartao online";
 if (isOnlineCard && (isGatewayConfigured || storeProfile?.settings?.payment_processing_mode !== "direct_store")) return false;
 if (seenNames.has(norm)) return false;
 seenNames.add(norm);
 return true;
 });

 if (deduplicatedManualMethods.length === 0) return null;

 return (
 <div className="space-y-2 pt-2">
 <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Outras Opções da Loja
 </Label>
 <div className="grid gap-2">
 {deduplicatedManualMethods.map((pm: any) => {
 const isSelected = formData.paymentMethod === "manual" && formData.paymentMethodId === pm.id;
 return (
 <button
 key={pm.id}
 type="button"
 onClick={() =>
 setFormData({
 ...formData,
 paymentMethod: "manual",
 paymentMethodId: pm.id,
 })
 }
 className={cn(
 "w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
 isSelected
 ? "border-primary bg-primary/5 ring-1 ring-primary font-bold"
 : "bg-card border-border/80 hover:bg-muted/40"
 )}
 >
 <div>
 <p className="text-xs font-bold text-foreground">{pm.name}</p>
 {pm.instructions && (
 <p className="text-xs text-muted-foreground/75 text-muted-foreground">{pm.instructions}</p>
 )}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 );
 })()}
 </div>

 <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
 <Button
 variant="outline"
 onClick={() => setActiveStep(2)}
 className="rounded-lg px-5 h-11 font-bold text-xs sm:text-sm"
 >
 Voltar
 </Button>
 <Button
 onClick={() => setActiveStep(4)}
 className="rounded-lg px-6 h-11 font-bold text-xs sm:text-sm cursor-pointer active:scale-98 transition-all flex items-center gap-2"
 >
 <span>Revisar Pedido</span>
 <ChevronRight size={15} />
 </Button>
 </div>
 </Surface>
 )}

 {/* ── ETAPA 4: REVISÃO & CONFIRMAÇÃO ── */}
 {activeStep === 4 && (
 <Surface variant="default" className="p-5 sm:p-6 rounded-lg space-y-5">
 <div className="space-y-4">
 {/* Resumo de Entrega / Reserva Metamórfico */}
                {isTourismNiche ? (
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <Plane size={14} className="text-primary" /> Reserva de Viagem & Turismo
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                    <p className="text-foreground font-semibold">
                      Pacote: {cart.items[0]?.productTitle || "Pacote de Viagem"}
                    </p>
                    <p className="text-muted-foreground">
                      Passageiros: {passengers.map((p) => p.name).filter(Boolean).join(", ") || "Conforme informado"}
                    </p>
                    {travelDepartureDate && (
                      <p className="text-muted-foreground">
                        Data de Saída: {travelDepartureDate} {travelReturnDate ? `| Retorno: ${travelReturnDate}` : ""}
                      </p>
                    )}
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-[10px]">
                      Voucher Digital Oficial — Frete Isento
                    </Badge>
                  </div>
                ) : isDigitalNiche ? (
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <Sparkles size={14} className="text-primary" /> Envio Digital Instantâneo
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                    <p className="text-muted-foreground">
                      Acessos e vouchers serão enviados para: <strong className="text-foreground font-mono">{formData.customerEmail}</strong>
                    </p>
                  </div>
                ) : isServiceNiche ? (
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <Calendar size={14} className="text-primary" /> Agendamento de Atendimento
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                    <p className="text-muted-foreground">
                      Data: <strong className="text-foreground">{serviceDate || "A combinar"}</strong> {serviceTimeSlot ? `(${serviceTimeSlot})` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      Local: {serviceLocationType === "store" ? (storeProfile?.address || "No Estabelecimento") : "Em Domicílio"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Truck size={14} className="text-primary" />
                        {formData.shippingMethod === "pickup" ? "Retirada no Balcão" : "Entrega em Domicílio"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                    {formData.shippingMethod !== "pickup" ? (
                      <p className="text-xs text-muted-foreground">
                        {formData.shippingAddress.street}, {formData.shippingAddress.number}{" "}
                        {formData.shippingAddress.complement && `(${formData.shippingAddress.complement})`} -{" "}
                        {formData.shippingAddress.neighborhood}, {formData.shippingAddress.city}/
                        {formData.shippingAddress.state} (CEP: {formData.shippingAddress.zipcode})
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {storeProfile?.address ? `${storeProfile.address}, ${storeProfile.city}` : "Endereço da loja"}
                      </p>
                    )}
                  </div>
                )}

 {/* Resumo de Pagamento */}
 <div className="p-4 rounded-lg bg-muted/20 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <CreditCard size={14} className="text-primary" />
 Forma de Pagamento
 </span>
 <button
 type="button"
 onClick={() => setActiveStep(3)}
 className="text-xs text-primary font-bold hover:underline cursor-pointer"
 >
 Alterar
 </button>
 </div>
 <p className="text-xs text-muted-foreground capitalize">
 {formData.paymentMethod === "pix"
 ? "PIX Instantâneo"
 : formData.paymentMethod === "credit_card"
 ? `Cartão de Crédito (${selectedInstallment}x)`
 : paymentInfo?.name || "Pagamento Combinado com a Loja"}
 </p>
 </div>

 {/* Observações do Pedido */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Observações / Instruções para a loja</Label>
 <Input
 placeholder="Ex: Deixar na portaria, ponto de referência..."
 value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="h-11 rounded-lg text-base sm:text-sm"
 />
 </div>
 </div>

        <div className="pt-3 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveStep(3)}
            disabled={isSubmitting}
            className="rounded-lg px-5 h-11 w-full sm:w-auto font-bold text-xs sm:text-sm"
          >
            Voltar
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="rounded-lg px-4 sm:px-8 h-11 sm:h-12 w-full sm:w-auto bg-primary text-primary-foreground font-bold text-xs sm:text-base cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                <span>Processando...</span>
              </>
            ) : (
              <span>Finalizar • {formatMoney(checkoutTotalCents)}</span>
                        )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center sm:text-right pt-2 leading-relaxed">
          Ao pedir, concorda com as nossas{" "}
          <button
            type="button"
            onClick={() => setIsPolicySheetOpen(true)}
            className="text-primary font-bold hover:underline cursor-pointer inline"
          >
            Políticas Pétreas
          </button>
          . Tolerância ZERO para fraudes ou abusos a entregadores. Cooperamos integralmente com as autoridades locais.
        </div>
      </Surface>
 )}
 </div>

 {/* Coluna da Direita: Resumo da Sacola & Totais */}
 <div className="space-y-4">
 <Surface variant="default" className="p-5 rounded-lg space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Resumo do Pedido
 </h3>

 <div className="space-y-3 divide-y divide-border/40">
 {cart.items.map((item: any) => {
   const itemImg = item.coverUrl || item.imageUrl || item.image_url || item.product?.cover_url || (item.product?.media && item.product.media[0]?.url);
   const itemTitle = item.product?.title || item.title || item.productTitle || "Produto";
   return (
     <div key={item.id} className="pt-3 first:pt-0 flex items-start gap-3 text-xs">
       {/* Miniatura Fotográfica Squircle do Produto */}
       <div className="size-12 rounded-lg bg-muted/20 border border-border/50 shrink-0 overflow-hidden flex items-center justify-center">
         {itemImg ? (
           <img
             src={itemImg}
             alt={itemTitle}
             className="size-full object-cover"
             loading="lazy"
           />
         ) : (
           <Package className="size-5 text-muted-foreground/50" />
         )}
       </div>

       <div className="min-w-0 flex-1">
         <p className="font-bold text-foreground truncate">
           {isTourismNiche ? `${passengerCount}x vaga(s) • ` : `${item.quantity || item.qty || 1}x `}{itemTitle}
         </p>
         {item.variant_name && (
           <p className="text-xs text-muted-foreground/75">{item.variant_name}</p>
         )}
         {item.selectedOptionsLabels && item.selectedOptionsLabels.length > 0 && (
           <div className="flex flex-wrap gap-1 mt-1">
             {item.selectedOptionsLabels.map((lbl: string, i: number) => (
               <span key={i} className="inline-flex items-center text-[10px] px-2 py-1 rounded bg-muted/60 text-muted-foreground">
                 {lbl}
               </span>
             ))}
           </div>
         )}
         {/* Observação por item */}
         <div className="mt-1">
           {openItemNoteId === item.id || itemNotes[item.id] ? (
             <div className="space-y-1 pt-1 animate-in fade-in-50">
               <Input
                 placeholder="Ex: ponto da carne, sem cebola, etc."
                 value={itemNotes[item.id] || ""}
                 onChange={(e) =>
                   setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                 }
                 className="h-7 text-xs rounded-lg px-2"
               />
             </div>
           ) : (
             <button
               type="button"
               onClick={() => setOpenItemNoteId(item.id)}
               className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer select-none"
             >
               + Observação do item
             </button>
           )}
         </div>
       </div>

       <span className="font-mono font-bold text-foreground shrink-0">
         {formatMoney(isTourismNiche ? item.price_cents * passengerCount : item.price_cents * (item.quantity || item.qty || 1))}
       </span>
     </div>
   );
 })}

 {/* Order Bump adicionado ao resumo se aceito */}
 {isOrderBumpAccepted && orderBumpOffer && (
   <div className="pt-3 flex items-start gap-3 text-xs bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/30">
     {orderBumpOffer.coverUrl && (
       <img
         src={orderBumpOffer.coverUrl}
         alt={orderBumpOffer.title}
         className="size-10 rounded-lg object-cover border border-emerald-500/30 shrink-0"
       />
     )}
     <div className="min-w-0 flex-1">
       <div className="flex items-center gap-2 flex-wrap">
         <span className="font-bold text-foreground truncate">1x {orderBumpOffer.title}</span>
         <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600">
           Order Bump
         </Badge>
       </div>
       <p className="text-[11px] text-muted-foreground">Oferta especial de checkout</p>
     </div>
     <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
       {formatMoney(orderBumpOffer.offerPriceCents)}
     </span>
   </div>
 )}
 </div>

 {/* Cupom / Vale Presente */}
 <div className="pt-3 space-y-2">
 <div className="flex items-center gap-2">
 <Input
 placeholder="Cupom ou Vale-presente"
 value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="h-10 rounded-lg text-base sm:text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCode.trim()}
                  className="h-10 rounded-lg text-xs font-bold px-4 cursor-pointer"
 >
 {isApplyingPromo ? <Loader2 size={12} className="animate-spin" /> : "Aplicar"}
 </Button>
 </div>

 {appliedGiftCard && (
 <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-success/10 text-success border border-success/20">
 <span className="flex items-center gap-1 font-bold">
 <Gift size={13} /> Vale: {appliedGiftCard.code}
 </span>
 <span>-{formatMoney(giftCardDeductionCents)}</span>
 </div>
 )}
 </div>

 {/* Linhas de Totais */}
 <div className="pt-3 space-y-2 text-xs">
 <div className="flex justify-between text-muted-foreground">
 <span>Subtotal {isTourismNiche && passengerCount > 1 ? `(${passengerCount} passageiros)` : ""}</span>
 <span className="font-mono">{formatMoney(effectiveSubtotalCents)}</span>
 </div>

 {cart.discountCents > 0 && (
 <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
 <span>Desconto Cupom</span>
 <span className="font-mono">-{formatMoney(cart.discountCents)}</span>
 </div>
 )}

 {paymentDiscountCents > 0 && (
 <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
 <span>Desconto Forma de Pagamento</span>
 <span className="font-mono">-{formatMoney(paymentDiscountCents)}</span>
 </div>
 )}

 {isPhysicalDelivery ? (
                <>
                  {formData.shippingMethod !== "pickup" && deliveryToDoor && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">Entrega na Porta / Apto</span>
                      <span className="font-mono">{formatMoney(doorDeliveryFeeCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete / Entrega</span>
                    <span className="font-mono">
                      {formData.shippingMethod === "pickup"
                        ? "Grátis"
                        : cart.shippingCents > 0
                        ? formatMoney(cart.shippingCents)
                        : "A calcular"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-muted-foreground">
                  <span>{isTourismNiche ? "Emissão de Voucher Digital" : isDigitalNiche ? "Envio Digital" : "Taxa de Atendimento"}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Grátis (Sem Frete)</span>
                </div>
              )}

              <div className="pt-2 flex justify-between items-baseline text-base font-bold text-foreground">
                <span>Total</span>
                <span className="font-mono text-lg font-black">{formatMoney(checkoutTotalCents)}</span>
              </div>
            </div>
          </Surface>
        </div>
      </div>

 {/* ── BARRA FIXA MOBILE NA THUMB ZONE (ETAPA 4) ── */}
 {activeStep === 4 && (
 <div
   className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 z-40 sm:hidden"
   style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)", padding: "12px 16px" }}
 >
   <div
     className="flex items-center justify-between gap-3 max-w-lg mx-auto"
     style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
   >
   <div className="flex flex-col">
   <span className="text-xs text-muted-foreground/75 text-muted-foreground uppercase font-bold tracking-wider">Total</span>
   <span className="text-base font-black font-mono text-foreground leading-tight">{formatMoney(checkoutTotalCents)}</span>
   </div>
   <Button
   onClick={handleSubmitOrder}
   disabled={isSubmitting}
   className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2"
   >
   {isSubmitting ? (
   <>
   <Loader2 size={16} className="animate-spin" />
   <span>Processando...</span>
   </>
   ) : (
   <span>Finalizar Pedido</span>
   )}
   </Button>
   </div>
 </div>
 )}
       {/* ── Modais de Segurança & Políticas (V139) ── */}
      <DeliveryLocationPolicySheet
        isOpen={isPolicySheetOpen}
        onOpenChange={setIsPolicySheetOpen}
      />
      <GpsMismatchModal
        isOpen={isGpsMismatchModalOpen}
        onOpenChange={setIsGpsMismatchModalOpen}
        distanceKm={gpsMismatchDistanceKm}
        deliveryAddressSummary={`${formData.shippingAddress.street || "Endereço"}, ${formData.shippingAddress.number || "S/N"} - ${formData.shippingAddress.neighborhood || ""}, ${formData.shippingAddress.city || ""}/${formData.shippingAddress.state || ""}`}
        onConfirmOrder={() => {
          setHasValidatedGpsMismatch(true);
          setTimeout(() => handleSubmitOrder(), 50);
        }}
        onChangeAddress={() => {
          setActiveStep(2);
        }}
      />
    </div>
  );
}
