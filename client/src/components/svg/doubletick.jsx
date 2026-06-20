 export default function Doubletick({
   width = 18,
   height = 10,
   color = "#0185D0",
   strokeWidth = 1.5,
 }) {
   return (
     <svg
       width={width}
       height={height}
       viewBox="0 0 18 10"
       fill="none"
       xmlns="http://www.w3.org/2000/svg"
     >
       <path
         d="M0.75 5.75L3.875 8.875M8.25 3.875L11.375 0.75M5.75 5.75L8.875 8.875L16.375 0.75"
         stroke={color}
         strokeWidth={strokeWidth}
         strokeLinecap="round"
         strokeLinejoin="round"
       />
     </svg>
   );
 }
