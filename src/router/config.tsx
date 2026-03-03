import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Intro from "../pages/intro/page";
import Home from "../pages/home/page";
import MyInfo from "../pages/myinfo/page";
import Subcategory from "../pages/subcategory/page";
import Input from "../pages/input/page";
import Result from "../pages/result/page";
import Records from "../pages/records/page";
import Quiz from "../pages/quiz/page";
import QuizResult from "../pages/quiz-result/page";
import Schedules from "../pages/schedules/page";
import Report from "../pages/report/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Intro />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/myinfo",
    element: <MyInfo />,
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
    path: "/quiz",
    element: <Quiz />,
  },
  {
    path: "/quiz-result",
    element: <QuizResult />,
  },
  {
    path: "/schedules",
    element: <Schedules />,
  },
  {
    path: "/report",
    element: <Report />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
