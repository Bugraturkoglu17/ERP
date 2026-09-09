"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSTANTS = {
  itemSize: 48,
  radius: 92,
  rowGap: 10,
  rowRise: 56,
  openStagger: 0.02,
  closeStagger: 0.07,
};

const STYLES: Record<string, Record<string, string>> = {
  trigger: {
    container:
      "rounded-full flex items-center bg-foreground justify-center cursor-pointer outline-none ring-0 hover:brightness-125 transition-all duration-100 z-50 shadow-lg",
    active: "bg-foreground",
  },
  item: {
    container:
      "rounded-full flex items-center justify-center absolute bg-muted hover:bg-muted/70 cursor-pointer shadow-md",
    labelBelow:
      "text-[11px] font-medium text-foreground absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap rounded-md bg-foreground/90 px-2 py-0.5 text-background",
    labelAbove:
      "text-[11px] font-medium text-foreground absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-foreground/90 px-2 py-0.5 text-background",
  },
};

// Öğeleri tek bir SIRA halinde (dairesel değil) dizer.
// direction="right": öğeler tetikleyicinin TAM YANINDAN başlayıp sağa
// doğru uzanır (y=0, aynı hizada) — arama çubuğunun sol-altına konan bir
// tetikleyici için doğal açılım budur.
// direction="up" (eski/varsayılan davranış): öğeler tetikleyicinin
// ÜSTÜNDE yatay bir sırada belirir; align="center" ortalar, "end"/"start"
// tetikleyicinin sağ/sol kenarına hizalayıp taşmayı önler.
const pointInRow = (
  i: number, n: number,
  align: "center" | "start" | "end",
  direction: "up" | "right",
) => {
  const spacing = CONSTANTS.itemSize + CONSTANTS.rowGap;
  if (direction === "right") {
    return { x: (i + 1) * spacing, y: 0 };
  }
  const totalWidth = spacing * (n - 1);
  const x =
    align === "end" ? i * spacing - totalWidth :
    align === "start" ? i * spacing :
    i * spacing - totalWidth / 2;
  return { x, y: -CONSTANTS.rowRise };
};

// startDeg: standart matematik açısı (0°=sağ, 90°=aşağı, 180°=sol,
// 270°=yukarı — ekran koordinatında y aşağı arttığı için). sweepDeg=360
// (varsayılan, tam daire) ise n öğe n'e bölünerek dağıtılır (son öğe ilk
// öğenin üstüne binmez). Daha dar bir sweepDeg verilirse öğeler o yayda
// UÇTAN UCA (n-1'e bölünerek) dizilir — tetikleyici ekran kenarına yakınsa
// (örn. bir filtre satırının en sağında) öğelerin ekran dışına taşıp
// kırpılmasını önlemek için CircleMenu'nün "arc" prop'uyla kullanılır.
const pointOnCircle = (i: number, n: number, r: number, startDeg: number, sweepDeg: number) => {
  const start = (startDeg * Math.PI) / 180;
  const isFullCircle = Math.abs(sweepDeg - 360) < 0.001;
  const step = isFullCircle
    ? (2 * Math.PI * i) / n
    : n > 1
      ? ((sweepDeg * Math.PI) / 180) * (i / (n - 1))
      : (sweepDeg * Math.PI) / 360;
  const theta = start + step;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

export type CircleMenuItem = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  /** Filtre gibi durumu olan öğelerde şu an aktif olduğunu gösteren nokta. */
  active?: boolean;
};

interface MenuItemProps {
  item: CircleMenuItem;
  index: number;
  totalItems: number;
  isOpen: boolean;
  onSelect: () => void;
  startDeg: number;
  sweepDeg: number;
  layout: "arc" | "row";
  rowAlign: "center" | "start" | "end";
  rowDirection: "up" | "right";
}

const MenuItem = ({ item, index, totalItems, isOpen, onSelect, startDeg, sweepDeg, layout, rowAlign, rowDirection }: MenuItemProps) => {
  const { x, y } =
    layout === "row"
      ? pointInRow(index, totalItems, rowAlign, rowDirection)
      : pointOnCircle(index, totalItems, CONSTANTS.radius, startDeg, sweepDeg);
  const [hovering, setHovering] = useState(false);

  return (
    <motion.button
      type="button"
      animate={{
        x: isOpen ? x : 0,
        y: isOpen ? y : 0,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
      }}
      whileHover={{ scale: 1.1, transition: { duration: 0.1, delay: 0 } }}
      transition={{
        delay: isOpen ? index * CONSTANTS.openStagger : index * CONSTANTS.closeStagger,
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      style={{ height: CONSTANTS.itemSize - 2, width: CONSTANTS.itemSize - 2 }}
      className={cn(STYLES.item.container, item.active && "ring-2 ring-blue-500 ring-offset-2")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={(e) => {
        e.stopPropagation();
        item.onClick?.();
        onSelect();
      }}
    >
      {item.icon}
      {hovering && isOpen && (
        <p className={layout === "row" ? STYLES.item.labelAbove : STYLES.item.labelBelow}>{item.label}</p>
      )}
    </motion.button>
  );
};

interface MenuTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
}

// Not: Referans bileşendeki "kapanırken büyüyüp renk değiştiren" (absorb)
// animasyonu KASITLI OLARAK kaldırıldı. O animasyon framer-motion'a
// `backgroundColor: color-mix(in srgb, var(--foreground) %X, var(--background))`
// gibi bir CSS FONKSİYONU veriyordu — framer-motion renk animasyonlarını
// hex/rgb/hsl olarak parse edip interpolize eder, color-mix() bir fonksiyon
// stringi olduğu için bunu tanıyamıyor; ara karede geçersiz bir renk üretip
// tarayıcı bunu görmezden geliyor, buton anlık olarak rengi kaybedip
// beyaza/şeffafa dönüyordu (bildirilen hata). Tetikleyici artık sabit
// bg-foreground rengini hiç kaybetmiyor, sadece basit bir scale/ikon geçişi var.
const MenuTrigger = ({
  isOpen,
  onToggle,
  openIcon,
  closeIcon,
}: MenuTriggerProps) => {
  return (
    <motion.div className="z-50">
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        style={{ height: CONSTANTS.itemSize, width: CONSTANTS.itemSize }}
        className={cn(STYLES.trigger.container, isOpen && STYLES.trigger.active)}
        onClick={onToggle}
      >
        <AnimatePresence mode="popLayout">
          {isOpen ? (
            <motion.span
              key="menu-close"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.2 }}
            >
              {closeIcon}
            </motion.span>
          ) : (
            <motion.span
              key="menu-open"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.2 }}
            >
              {openIcon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

/**
 * Dokunma/tıklama ile açılan, öğelerin bir daire üzerinde yayıldığı
 * kompakt bir "navigator" menüsü. Orijinal referans bileşeninden iki
 * farkı var:
 *  - Öğeler `href` ile sayfa navigasyonu yerine `onClick` ile filtre/aksiyon
 *    tetikler (bu proje bağlamında "Bölgeler", "Mağaza Türü", "Aktif/Pasif"
 *    gibi filtreler için kullanılıyor, link değil).
 *  - Dış sarmalayıcı sabit 250x250 alan kaplamaz — kapalıyken sadece
 *    tetikleyici (48x48) kadar yer kaplar, öğeler açıldığında kapsayıcının
 *    ÜZERİNE (absolute, overflow kırpılmadan) taşar. Böylece bir filtre
 *    satırının içinde diğer elemanları iterek büyük boş alan bırakmaz.
 */
export function CircleMenu({
  items,
  openIcon = <Menu size={18} className="text-background" />,
  closeIcon = <X size={18} className="text-background" />,
  /** Öğelerin açılacağı yay: matematik açısı, 0°=sağ, 90°=aşağı, 180°=sol,
      270°=yukarı. Varsayılan tam daire. Tetikleyici ekran kenarına yakınsa
      (örn. bir filtre satırının en sağı) dar bir yay verip taşmayı önleyin
      — örn. startDeg=180, sweepDeg=90 → öğeler SADECE sol-üst çeyrekte açılır. */
  startDeg = -90,
  sweepDeg = 360,
  /** "arc" (varsayılan): öğeler bir yay/daire üzerinde dağılır. "row":
      öğeler tetikleyicinin ÜSTÜNDE, tek bir yatay sırada, aynı hizada
      dizilir (dairesel değil). */
  layout = "arc",
  /** Sadece layout="row" içindir: sıra tetikleyiciye göre nereden açılsın.
      "center" (varsayılan) simetrik yayar — tetikleyici ekranın kenarına
      yakınsa taşabilir. "end" sırayı tetikleyicinin SAĞ kenarına hizalar,
      SADECE SOLA doğru açar (tetikleyici sağ kenara yakınsa güvenli).
      "start" ise SOL kenara hizalar, SADECE SAĞA doğru açar. rowAlign
      "direction" (aşağıda) "right" iken hiç kullanılmaz. */
  rowAlign = "center",
  /** Sadece layout="row" içindir: "up" (varsayılan) öğeleri tetikleyicinin
      ÜSTÜNDE bir sırada açar; "right" öğeleri tetikleyicinin TAM YANINDAN
      başlayıp SAĞA doğru, aynı hizada açar (örn. arama çubuğunun altındaki
      bir tetikleyici için). */
  rowDirection = "up",
  className,
}: {
  items: CircleMenuItem[];
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  startDeg?: number;
  sweepDeg?: number;
  layout?: "arc" | "row";
  rowAlign?: "center" | "start" | "end";
  rowDirection?: "up" | "right";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const animate = useAnimationControls();

  // "row" modunda döndürme/bulanıklaştırma animasyonu (dairesel modun kendi
  // kapanış efekti) sıradaki öğelerle uyuşmuyor — sadece kayıp basitçe kapanır.
  const closeAnimationCallback = async () => {
    if (layout === "row") return;
    await animate.start({
      rotate: -360,
      filter: "blur(1px)",
      transition: { duration: CONSTANTS.closeStagger * (items.length + 2), ease: "linear" },
    });
    await animate.start({ rotate: 0, filter: "blur(0px)", transition: { duration: 0 } });
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      closeAnimationCallback();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            closeAnimationCallback();
          }}
        />
      )}
      <MenuTrigger
        isOpen={isOpen}
        onToggle={handleToggle}
        openIcon={openIcon}
        closeIcon={closeIcon}
      />
      {/* pointer-events-none: bu kapsayıcı, tetikleyicinin (MenuTrigger)
          TAM ÜSTÜNDE aynı z-index'te duruyor (öğeler her zaman DOM'da
          mevcut, sadece isOpen ile görünür/tıklanabilir oluyor). Kapsayıcı
          kendi başına pointer-events'i AÇIK bırakırsa, gerçek bir fare
          tıklaması tetikleyiciye hiç ulaşmadan bu boş div'e "hit-test"
          edilir ve trigger'ın onClick'i tetiklenmez (programatik .click()
          bunu bypass ettiği için test sırasında fark edilmemişti). Her
          MenuItem kendi pointerEvents'ini (isOpen ? "auto" : "none") ayrıca
          ayarladığı için, kapsayıcı "none" olsa da açık öğeler yine
          tıklanabilir kalır (CSS pointer-events çocuklarda override edilir). */}
      <motion.div animate={animate} className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
        {items.map((item, index) => (
          <MenuItem
            key={item.label}
            item={item}
            index={index}
            totalItems={items.length}
            isOpen={isOpen}
            onSelect={() => setIsOpen(false)}
            startDeg={startDeg}
            sweepDeg={sweepDeg}
            layout={layout}
            rowAlign={rowAlign}
            rowDirection={rowDirection}
          />
        ))}
      </motion.div>
    </div>
  );
}
