import { createBrowserRouter } from "react-router";
import { Home } from "./components/Home";
import { ScanProduct } from "./components/ScanProduct";
import { ProductResults } from "./components/ProductResults";
import { Alternatives } from "./components/Alternatives";
import { Profile } from "./components/Profile";
import { IngredientDetail } from "./components/IngredientDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/scan",
    Component: ScanProduct,
  },
  {
    path: "/results/:productId",
    Component: ProductResults,
  },
  {
    path: "/alternatives/:productId",
    Component: Alternatives,
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/ingredient/:ingredientId",
    Component: IngredientDetail,
  },
]);
