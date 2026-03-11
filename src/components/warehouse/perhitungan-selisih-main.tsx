import { useMemo, useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BoxDimension = {
  length: string;
  width: string;
  height: string;
};

type BoxCalculationDetail = {
  boxNumber: number;
  length: number;
  width: number;
  height: number;
  volumeCm3: number;
  volumeM3: number;
};

type CalculationResult = {
  details: BoxCalculationDetail[];
  totalVolumeCm3: number;
  totalVolumeM3: number;
  targetVolumeM3?: number;
  selisihM3?: number;
};

const MIN_BOX = 1;
const MAX_BOX = 200;

const makeEmptyBox = (): BoxDimension => ({
  length: "",
  width: "",
  height: "",
});

const resizeBoxes = (current: BoxDimension[], nextCount: number): BoxDimension[] => {
  if (nextCount <= current.length) {
    return current.slice(0, nextCount);
  }

  const additional = Array.from(
    { length: nextCount - current.length },
    () => makeEmptyBox()
  );

  return [...current, ...additional];
};

const parsePositiveNumber = (value: string): number | null => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const formatCm3 = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);

const formatM3 = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);

function PerhitunganSelisihMain() {
  const { toast } = useToast();

  const [boxCount, setBoxCount] = useState<string>("1");
  const [boxes, setBoxes] = useState<BoxDimension[]>([makeEmptyBox()]);
  const [targetVolumeM3, setTargetVolumeM3] = useState<string>("");
  const [result, setResult] = useState<CalculationResult | null>(null);

  const validBoxCount = useMemo(() => {
    const parsed = Number(boxCount);
    if (!Number.isInteger(parsed) || parsed < MIN_BOX || parsed > MAX_BOX) {
      return null;
    }
    return parsed;
  }, [boxCount]);

  const handleBoxCountChange = (value: string) => {
    setBoxCount(value);
    setResult(null);

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return;
    }

    const clamped = Math.min(MAX_BOX, Math.max(MIN_BOX, parsed));
    setBoxes((prev) => resizeBoxes(prev, clamped));
  };

  const handleBoxFieldChange = (
    index: number,
    key: keyof BoxDimension,
    value: string
  ) => {
    setBoxes((prev) =>
      prev.map((box, boxIndex) =>
        boxIndex === index ? { ...box, [key]: value } : box
      )
    );
    setResult(null);
  };

  const handleReset = () => {
    setBoxCount("1");
    setBoxes([makeEmptyBox()]);
    setTargetVolumeM3("");
    setResult(null);
  };

  const handleCalculate = () => {
    if (!validBoxCount) {
      toast({
        title: "Jumlah box tidak valid",
        description: `Isi jumlah box antara ${MIN_BOX} sampai ${MAX_BOX}.`,
        variant: "destructive",
      });
      return;
    }

    const workingBoxes = boxes.slice(0, validBoxCount);
    const details: BoxCalculationDetail[] = [];

    for (let i = 0; i < workingBoxes.length; i += 1) {
      const box = workingBoxes[i];
      const length = parsePositiveNumber(box.length);
      const width = parsePositiveNumber(box.width);
      const height = parsePositiveNumber(box.height);

      if (!length || !width || !height) {
        toast({
          title: "Dimensi belum lengkap",
          description: `Box ${i + 1} harus memiliki panjang, lebar, dan tinggi lebih dari 0.`,
          variant: "destructive",
        });
        return;
      }

      const volumeCm3 = length * width * height;
      details.push({
        boxNumber: i + 1,
        length,
        width,
        height,
        volumeCm3,
        volumeM3: volumeCm3 / 1_000_000,
      });
    }

    const totalVolumeCm3 = details.reduce(
      (sum, box) => sum + box.volumeCm3,
      0
    );
    const totalVolumeM3 = totalVolumeCm3 / 1_000_000;

    const target = parsePositiveNumber(targetVolumeM3);
    const nextResult: CalculationResult = {
      details,
      totalVolumeCm3,
      totalVolumeM3,
    };

    if (target) {
      nextResult.targetVolumeM3 = target;
      nextResult.selisihM3 = totalVolumeM3 - target;
    }

    setResult(nextResult);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Warehouse - Perhitungan Selisih</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Input dimensi setiap box dalam satuan cm. Rumus per box:
            panjang x lebar x tinggi.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Jumlah Box</label>
              <Input
                type="number"
                min={MIN_BOX}
                max={MAX_BOX}
                value={boxCount}
                onChange={(event) => handleBoxCountChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Volume Acuan (m3, opsional)
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={targetVolumeM3}
                onChange={(event) => {
                  setTargetVolumeM3(event.target.value);
                  setResult(null);
                }}
                placeholder="Contoh: 1.2500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.slice(0, validBoxCount ?? boxes.length).map((box, index) => (
              <Card key={`box-${index + 1}`} className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Box {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Panjang (cm)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={box.length}
                      onChange={(event) =>
                        handleBoxFieldChange(index, "length", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Lebar (cm)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={box.width}
                      onChange={(event) =>
                        handleBoxFieldChange(index, "width", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Tinggi (cm)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={box.height}
                      onChange={(event) =>
                        handleBoxFieldChange(index, "height", event.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button onClick={handleCalculate}>Calculate</Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail Perhitungan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 rounded-md border bg-slate-50 p-3 text-sm">
              <div>Total Box: {result.details.length}</div>
              <div>Total Volume (cm3): {formatCm3(result.totalVolumeCm3)} cm3</div>
              <div>Total Volume (m3): {formatM3(result.totalVolumeM3)} m3</div>
              {result.targetVolumeM3 ? (
                <div>Volume Acuan: {formatM3(result.targetVolumeM3)} m3</div>
              ) : null}
              {typeof result.selisihM3 === "number" ? (
                <div>
                  Selisih (Total - Acuan): {formatM3(result.selisihM3)} m3
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              {result.details.map((box) => (
                <div
                  key={box.boxNumber}
                  className="rounded-md border p-3 text-sm text-slate-700"
                >
                  <div className="font-medium">Box {box.boxNumber}</div>
                  <div>
                    {box.length} x {box.width} x {box.height} ={" "}
                    {formatCm3(box.volumeCm3)} cm3
                  </div>
                  <div>= {formatM3(box.volumeM3)} m3</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default PerhitunganSelisihMain;
