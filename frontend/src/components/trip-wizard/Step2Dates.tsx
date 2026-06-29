import { UseFormReturn } from "react-hook-form";
import { TripFormValues } from "./TripWizard";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Wallet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Step2Props {
    form: UseFormReturn<TripFormValues>;
}

const BUDGET_TIERS = [
    { id: "budget", label: "Budget", desc: "Hostels & Street Food" },
    { id: "moderate", label: "Moderate", desc: "3★ Hotels & Local Dining" },
    { id: "luxury", label: "Luxury", desc: "5★ Resorts & Fine Dining" },
];

export default function Step2Dates({ form }: Step2Props) {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-display text-white">When and How?</h3>
                <p className="text-white/60 mt-2">Set your travel dates and budget level.</p>
            </div>

            {/* Date Range Picker — full width so dual-month calendar can open via portal */}
            <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-white/80 font-mono text-sm uppercase mb-2 tracking-wider">
                            Travel Dates
                        </FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full h-14 pl-4 text-left font-normal glass-input text-white border-white/20 hover:bg-white/10 hover:text-white justify-start",
                                            !field.value?.from && "text-white/40"
                                        )}
                                    >
                                        <CalendarIcon className="mr-4 h-5 w-5 text-sky-vivid flex-shrink-0" />
                                        {field.value?.from ? (
                                            field.value.to ? (
                                                <>
                                                    {format(field.value.from, "LLL dd, y")} –{" "}
                                                    {format(field.value.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(field.value.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick your travel dates</span>
                                        )}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            {/* Renders via Radix portal — always above page content */}
                            <PopoverContent
                                className="w-auto p-0 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl"
                                align="start"
                                style={{ zIndex: 9999, background: 'rgba(13, 21, 38, 0.60)' }}
                            >
                                <Calendar
                                    autoFocus
                                    mode="range"
                                    defaultMonth={field.value?.from ?? new Date()}
                                    selected={{
                                        from: field.value?.from,
                                        to: field.value?.to,
                                    }}
                                    onSelect={field.onChange}
                                    numberOfMonths={1}
                                    className="text-white p-3"
                                    classNames={{
                                        day_selected: "bg-sky-pure text-white hover:bg-sky-pure hover:text-white focus:bg-sky-pure focus:text-white rounded-full",
                                        day_today: "border border-sky-vivid/60 text-white font-bold rounded-full",
                                        day_range_middle: "bg-sky-pure/20 text-white rounded-none",
                                        day_range_start: "bg-sky-pure text-white rounded-full",
                                        day_range_end: "bg-sky-pure text-white rounded-full",
                                        day: "h-9 w-9 text-sm font-medium hover:bg-white/10 rounded-full transition-colors",
                                        head_cell: "text-white/40 font-mono text-xs uppercase w-9",
                                        caption: "flex justify-center pt-1 relative items-center text-white font-semibold mb-2",
                                        nav_button: "h-7 w-7 bg-transparent hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white",
                                        table: "w-full border-collapse space-y-1",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage className="text-pink-400" />
                    </FormItem>
                )}
            />

            {/* Budget Selector — full width, below date picker */}
            <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-white/80 font-mono text-sm uppercase mb-2 tracking-wider">
                            Budget per Person
                        </FormLabel>
                        <div className="relative group w-full">
                            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 h-5 w-5 z-10 pointer-events-none" />
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full h-14 pl-12 text-base glass-input text-white border-white/20 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-md transition-all outline-none bg-transparent">
                                        <SelectValue placeholder="Select budget tier" />
                                    </SelectTrigger>
                                </FormControl>
                                {/* Renders via Radix portal — always above page content */}
                                <SelectContent
                                    position="popper"
                                    sideOffset={4}
                                    className="border border-white/15 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                                    style={{ zIndex: 9999, width: "var(--radix-select-trigger-width)", background: 'rgba(13, 21, 38, 0.60)' }}
                                >
                                    {BUDGET_TIERS.map(tier => (
                                        <SelectItem
                                            key={tier.id}
                                            value={tier.id}
                                            className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer select-none py-3 px-4"
                                        >
                                            <span className="font-semibold">{tier.label}</span>
                                            <span className="text-white/50 ml-2 text-sm">– {tier.desc}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <FormMessage className="text-pink-400" />
                    </FormItem>
                )}
            />
        </div>
    );
}
