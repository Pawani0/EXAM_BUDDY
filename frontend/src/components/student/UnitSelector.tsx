import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SyllabusUnit {
    unit: string;
    unit_name?: string | null;
    topics: string[];
}

interface UnitSelectorProps {
    units: SyllabusUnit[];
    onSelectionChange: (selectedUnits: SyllabusUnit[]) => void;
}

export const UnitSelector = ({ units, onSelectionChange }: UnitSelectorProps) => {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    useEffect(() => {
        // Select all by default
        setSelectedIndices(units.map((_, i) => i));
    }, [units]);

    useEffect(() => {
        const selected = units.filter((_, i) => selectedIndices.includes(i));
        onSelectionChange(selected);
    }, [selectedIndices, units, onSelectionChange]);

    const toggleUnit = (index: number) => {
        setSelectedIndices((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const toggleAll = () => {
        if (selectedIndices.length === units.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(units.map((_, i) => i));
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Select Units</CardTitle>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                        {selectedIndices.length === units.length ? "Deselect All" : "Select All"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 max-h-[300px] overflow-y-auto">
                {units.map((unit, index) => (
                    <div key={index} className="flex items-start space-x-3 space-y-0">
                        <Checkbox
                            id={`unit-${index}`}
                            checked={selectedIndices.includes(index)}
                            onCheckedChange={() => toggleUnit(index)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor={`unit-${index}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {unit.unit}
                            </Label>
                            {unit.unit_name && (
                                <p className="text-xs text-muted-foreground">{unit.unit_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {unit.topics.length} topics
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
