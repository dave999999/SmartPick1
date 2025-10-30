import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessPopup } from "./BusinessPopup";
import { getBusinessEmoji } from "../helpers/businessCategories";
import type { OutputType } from "../endpoints/products/list_GET.schema";
import styles from "./ProductsMap.module.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type ProductWithBusiness = OutputType[0];

interface ProductsMapProps {
  items: ProductWithBusiness[];
  onReserveClick?: (item: ProductWithBusiness) => void;
  isAuthenticated?: boolean;
}

// Helper component to update map center and add user location
const MapController: React.FC<{
  center: [number, number];
  userLocation: [number, number] | null;
}> = ({ center, userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 13);
    } else {
      map.setView(center, 13);
    }
  }, [center, userLocation, map]);

  return null;
};

// Create custom pulsing marker icon
const createPulsingIcon = (
  count: number,
  hasAvailableProducts: boolean,
  businessType: string
) => {
  const markerClass = hasAvailableProducts
    ? styles.pulsingMarkerAvailable
    : styles.pulsingMarkerClosed;
  
  const emoji = getBusinessEmoji(businessType);
  
  const iconHtml = `
    <div class="${styles.pulsingMarker} ${markerClass}">
      <div class="${styles.pulsingMarkerInner}">
        <div class="${styles.markerEmoji}">${emoji}</div>
        <div class="${styles.markerCountBadge}">${count}</div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: styles.customMarkerContainer,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// Create user location marker
const createUserIcon = () => {
  const iconHtml = `
    <div class="${styles.userMarker}">
      <div class="${styles.userMarkerInner}"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: styles.userMarkerContainer,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const ProductsMap: React.FC<ProductsMapProps> = ({
  items,
  onReserveClick,
  isAuthenticated,
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  // Request user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        (error) => {
          console.log("Geolocation error:", error);
          // Silently fail - user location is optional
        }
      );
    }
  }, []);

  // Group items by business
  const businessMap = new Map<
    number,
    { item: ProductWithBusiness; products: ProductWithBusiness[] }
  >();

  items.forEach((item) => {
    if (item.business.latitude && item.business.longitude) {
      if (!businessMap.has(item.business.id)) {
        businessMap.set(item.business.id, {
          item,
          products: [],
        });
      }
      businessMap.get(item.business.id)!.products.push(item);
    }
  });

  const businesses = Array.from(businessMap.values());

  // Calculate center point (average of all coordinates or user location)
  const defaultCenter: [number, number] =
    businesses.length > 0
      ? [
          businesses.reduce(
            (sum, { item }) => sum + Number(item.business.latitude),
            0
          ) / businesses.length,
          businesses.reduce(
            (sum, { item }) => sum + Number(item.business.longitude),
            0
          ) / businesses.length,
        ]
      : [41.7151, 44.8271]; // Default to Tbilisi

  const center = userLocation || defaultCenter;

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={13}
        className={styles.map}
        scrollWheelZoom={true}
      >
        <MapController center={defaultCenter} userLocation={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon()}>
            <Popup>
              <div className={styles.userPopup}>
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Business markers */}
        {businesses.length > 0 && businesses.map(({ item, products }) => {
          const lat = Number(item.business.latitude);
          const lng = Number(item.business.longitude);
          const productCount = products.length;
          const hasAvailableProducts = products.some(
            (p) => p.product.status === "available" && p.product.quantity > 0
          );

          return (
            <Marker
              key={item.business.id}
              position={[lat, lng]}
              icon={createPulsingIcon(productCount, hasAvailableProducts, item.business.businessType)}
            >
              <Popup maxWidth={420} className={styles.businessPopupContainer}>
                <BusinessPopup
                  business={item.business}
                  products={products}
                  onReserveClick={onReserveClick}
                  isAuthenticated={isAuthenticated}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};