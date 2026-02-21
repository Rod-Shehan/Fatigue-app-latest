import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Users, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function SheetHeader({ sheetData, onChange, readOnly = false }) {
  const handleChange = (field, value) => {
    onChange({ ...sheetData, [field]: value });
  };

  const driverType = sheetData.driver_type || "solo";

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.filter({ is_active: true }, "name"),
  });

  return (
    <div className="space-y-4">
      {/* Solo / Two-Up toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mr-2">
          Driver Type
        </Label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleChange("driver_type", "solo")}
            className={`px-4 py-1.5 text-xs font-bold transition-colors ${
              driverType === "solo"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Solo
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleChange("driver_type", "two_up")}
            className={`px-4 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 ${
              driverType === "two_up"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            Two-Up
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <User className="w-3 h-3" /> Driver Name
          </Label>
          {drivers.length > 0 ? (
            <Select
              value={sheetData.driver_name || ""}
              onValueChange={(val) => handleChange("driver_name", val)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 font-medium">
                <SelectValue placeholder="Select driver…" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={sheetData.driver_name || ""}
              onChange={(e) => handleChange("driver_name", e.target.value)}
              placeholder="Full name (no drivers added yet)"
              className="h-9 font-medium"
              disabled={readOnly}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Users className="w-3 h-3" /> {driverType === "two_up" ? "Second Driver *" : "Second Driver"}
          </Label>
          {drivers.length > 0 ? (
            <Select
              value={sheetData.second_driver || ""}
              onValueChange={(val) => handleChange("second_driver", val)}
              disabled={readOnly}
            >
              <SelectTrigger className={`h-9 ${driverType === "two_up" ? "border-amber-300" : ""}`}>
                <SelectValue placeholder={driverType === "two_up" ? "Required for Two-Up" : "Optional"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— None —</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={sheetData.second_driver || ""}
              onChange={(e) => handleChange("second_driver", e.target.value)}
              placeholder={driverType === "two_up" ? "Required for Two-Up" : "Optional"}
              className={`h-9 ${driverType === "two_up" ? "border-amber-300 focus:border-amber-400" : ""}`}
              disabled={readOnly}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Destination
          </Label>
          <Input
            value={sheetData.destination || ""}
            onChange={(e) => handleChange("destination", e.target.value)}
            placeholder="Destination"
            className="h-9"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Week Starting
          </Label>
          <Input
            type="date"
            value={sheetData.week_starting || ""}
            onChange={(e) => handleChange("week_starting", e.target.value)}
            className="h-9 font-mono"
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}