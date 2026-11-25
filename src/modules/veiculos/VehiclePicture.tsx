import { cn } from "@/lib/cn";
import { photoFor } from "./photos";
import type { Vehicle } from "./types";
import { VehicleMini } from "./VehicleMini";

/**
 * O veículo como ele aparece na garagem e na página dele: a foto do modelo quando o app tem
 * uma (hoje, o Mobi), senão o desenho na cor do cadastro. Dentro de um `group`, sobe no hover.
 */
export function VehiclePicture({ vehicle, className, large }: { vehicle: Vehicle; className?: string; large?: boolean }) {
  const photo = photoFor(vehicle);
  if (!photo) return <VehicleMini kind={vehicle.kind} color={vehicle.color} className={className} />;
  return (
    <div className={cn("relative flex items-end justify-center", className)}>
      <span aria-hidden className="absolute bottom-[3%] left-1/2 h-[9%] w-[78%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-[3px]" />
      <img
        src={photo}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          "relative h-full w-auto max-w-full object-contain transition-transform duration-300 ease-out select-none group-hover:-translate-y-1.5",
          large && "drop-shadow-[0_18px_18px_rgba(0,0,0,0.12)]",
        )}
      />
    </div>
  );
}
