import { useEffect, useState } from "react";

/**
 * sm: <552px
 * md: 552px - 768px
 * lg: 768px - 1024px
 * xl: > 1024px
 */

const useScreenSize = () => {
  const [size, setSize] = useState("sm");

  useEffect(() => {
    /**
     *
     * @type {import("react").UIEventHandler}
     */
    function handleResize() {
      const width = window.innerWidth;
      
      if (width < 552) {
        setSize("sm");
      } else if (width < 768) {
        setSize("md");
      } else if (width < 1024) {
        setSize("lg");
      } else {
        setSize("xl");
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
};

export default useScreenSize;
