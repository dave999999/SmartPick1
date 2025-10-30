import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";
import { Button } from "../components/Button";
import { ImageUpload } from "../components/ImageUpload";
import {
  postBusinessesRegister,
  schema as registerSchema,
} from "../endpoints/businesses/register_POST.schema";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Loader, Search } from "lucide-react";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./partner.register.module.css";

// Fix for default Leaflet marker icon issue with bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const formSchema = registerSchema;
type FormData = z.infer<typeof formSchema>;

const LocationPicker = ({
  onChange,
}: {
  onChange: (latlng: { lat: number; lng: number }) => void;
}) => {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return null;
};

const PartnerRegisterPage = () => {
  const { t } = useTranslation();
  const [isSuccess, setIsSuccess] = useState(false);
  // Default position is Tbilisi, Georgia
  const [position, setPosition] = useState<[number, number]>([41.7151, 44.8271]);
  const [searchAddress, setSearchAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      latitude: position[0],
      longitude: position[1],
    },
  });

  const mutation = useMutation({
    mutationFn: postBusinessesRegister,
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("messages.registrationFailed")
      );
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  useEffect(() => {
    setValue("latitude", position[0]);
    setValue("longitude", position[1]);
  }, [position, setValue]);

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchAddress)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPosition: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPosition);
        
        // Fly to the new position
        if (mapRef.current) {
          mapRef.current.flyTo(newPosition, 15);
        }
      } else {
        toast.error(t("partnerRegister.addressNotFound"));
      }
    } catch (error) {
      console.error("Address search error:", error);
      toast.error(t("partnerRegister.addressNotFound"));
    } finally {
      setIsSearching(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle className={styles.successIcon} />
        <h1 className={styles.title}>{t("partnerRegister.registrationSuccessTitle")}</h1>
        <p className={styles.subtitle}>
          {t("partnerRegister.registrationSuccessMessage")}
        </p>
        <Button asChild>
          <a href="/">{t("partnerRegister.backToHome")}</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("partnerRegister.title")} | SmartPick</title>
      </Helmet>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("partnerRegister.title")}</h1>
          <p className={styles.subtitle}>
            {t("partnerRegister.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t("partnerRegister.businessDetails")}</h2>
            <div className={styles.field}>
              <label htmlFor="name">{t("partnerRegister.businessName")}</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" {...field} />}
              />
              {errors.name && (
                <p className={styles.error}>{errors.name.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="description">{t("partnerRegister.businessDescription")}</label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => <Textarea id="description" {...field} />}
              />
              {errors.description && (
                <p className={styles.error}>{errors.description.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="businessType">{t("partnerRegister.businessType")}</label>
              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="businessType">
                      <SelectValue placeholder={t("partnerRegister.businessTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bakery">{t("businessTypes.bakery")}</SelectItem>
                      <SelectItem value="Restaurant">{t("businessTypes.restaurant")}</SelectItem>
                      <SelectItem value="Cafe">{t("businessTypes.cafe")}</SelectItem>
                      <SelectItem value="Food Truck">{t("businessTypes.foodTruck")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessType && (
                <p className={styles.error}>{errors.businessType.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="address">{t("partnerRegister.businessAddress")}</label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => <Input id="address" {...field} />}
              />
              {errors.address && (
                <p className={styles.error}>{errors.address.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label>{t("partnerRegister.location")}</label>
              <div className={styles.searchForm}>
                <div className={styles.searchInputWrapper}>
                  <Search className={styles.searchIcon} size={18} />
                  <Input
                    placeholder={t("partnerRegister.addressSearchPlaceholder")}
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    disabled={isSearching}
                    className={styles.searchInput}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddressSearch}
                  disabled={isSearching || !searchAddress.trim()}
                  size="md"
                >
                  {isSearching ? (
                    <>
                      <Loader className={styles.spinner} size={16} />
                      {t("partnerRegister.searching")}
                    </>
                  ) : (
                    t("partnerRegister.searchButton")
                  )}
                </Button>
              </div>
              <p className={styles.mapHint}>{t("partnerRegister.clickMap")}</p>
              <div className={styles.mapContainer}>
                <MapContainer
                  center={position}
                  zoom={12}
                  scrollWheelZoom={false}
                  style={{ height: "300px", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={position}
                    draggable={true}
                    ref={markerRef}
                    eventHandlers={{
                      dragend: () => {
                        const marker = markerRef.current;
                        if (marker != null) {
                          const { lat, lng } = marker.getLatLng();
                          setPosition([lat, lng]);
                        }
                      },
                    }}
                  />
                  <LocationPicker
                    onChange={(latlng) => setPosition([latlng.lat, latlng.lng])}
                  />
                </MapContainer>
              </div>
              <p className={styles.latLngDisplay}>
                Lat: {position[0].toFixed(4)}, Lng: {position[1].toFixed(4)}
              </p>
            </div>
            <div className={styles.field}>
              <label>{t("partnerRegister.image")}</label>
              <Controller
                name="logoUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.logoUrl && (
                <p className={styles.error}>{errors.logoUrl.message}</p>
              )}
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t("partnerRegister.ownerDetails")}</h2>
            <div className={styles.field}>
              <label htmlFor="ownerDisplayName">{t("partnerRegister.ownerName")}</label>
              <Controller
                name="ownerDisplayName"
                control={control}
                render={({ field }) => (
                  <Input id="ownerDisplayName" {...field} />
                )}
              />
              {errors.ownerDisplayName && (
                <p className={styles.error}>
                  {errors.ownerDisplayName.message}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="ownerEmail">{t("partnerRegister.ownerEmail")}</label>
              <Controller
                name="ownerEmail"
                control={control}
                render={({ field }) => (
                  <Input id="ownerEmail" type="email" {...field} />
                )}
              />
              {errors.ownerEmail && (
                <p className={styles.error}>{errors.ownerEmail.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="phone">{t("partnerRegister.phone")}</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phone"
                    type="tel"
                    {...field}
                    value={field.value ?? ""}
                  />
                )}
              />
              {errors.phone && (
                <p className={styles.error}>{errors.phone.message}</p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="ownerPassword">{t("partnerRegister.password")}</label>
              <Controller
                name="ownerPassword"
                control={control}
                render={({ field }) => (
                  <Input id="ownerPassword" type="password" {...field} />
                )}
              />
              {errors.ownerPassword && (
                <p className={styles.error}>{errors.ownerPassword.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className={styles.submitButton}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader className={styles.spinner} /> {t("partnerRegister.submitting")}
              </>
            ) : (
              t("partnerRegister.submit")
            )}
          </Button>
        </form>
      </div>
    </>
  );
};

export default PartnerRegisterPage;