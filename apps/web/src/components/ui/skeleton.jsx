import * as React from "react";

import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn("skeleton-shimmer rounded-xl", className)}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

const SkeletonText = ({ lines = 2, className }) => (
  <div aria-hidden="true" className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
      />
    ))}
  </div>
);

export { Skeleton, SkeletonText };
