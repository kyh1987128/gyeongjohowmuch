
import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import MyInfo from "../pages/myinfo/page";
import Subcategory from "../pages/subcategory/page";
import Input from "../pages/input/page";
import Result from "../pages/result/page";
import Records from "../pages/records/page";

const routes: RouteObject[] = [
  {
    path: "/myinfo",
    element: <MyInfo />,
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/subcategory",
    element: <Subcategory />,
  },
  {
    path: "/input",
    element: <Input />,
  },
  {
    path: "/result",
    element: <Result />,
  },
  {
    path: "/records",
    element: <Records />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
