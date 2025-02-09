import ChangeIncidentState, {
  IncidentType,
} from "../../../Components/Incident/ChangeState";
import LabelsElement from "../../../Components/Label/Labels";
import MonitorsElement from "../../../Components/Monitor/Monitors";
import OnCallDutyPoliciesView from "../../../Components/OnCallPolicy/OnCallPolicies";
import EventName from "../../../Utils/EventName";
import PageComponentProps from "../../PageComponentProps";
import BaseModel from "Common/Models/BaseModel";
import SortOrder from "Common/Types/BaseDatabase/SortOrder";
import { Black } from "Common/Types/BrandColors";
import { LIMIT_PER_PROJECT } from "Common/Types/Database/LimitMax";
import OneUptimeDate from "Common/Types/Date";
import BadDataException from "Common/Types/Exception/BadDataException";
import { PromiseVoidFunction } from "Common/Types/FunctionTypes";
import { JSONObject } from "Common/Types/JSON";
import ObjectID from "Common/Types/ObjectID";
import CheckboxViewer from "CommonUI/src/Components/Checkbox/CheckboxViewer";
import ErrorMessage from "CommonUI/src/Components/ErrorMessage/ErrorMessage";
import FormFieldSchemaType from "CommonUI/src/Components/Forms/Types/FormFieldSchemaType";
import InfoCard from "CommonUI/src/Components/InfoCard/InfoCard";
import PageLoader from "CommonUI/src/Components/Loader/PageLoader";
import CardModelDetail from "CommonUI/src/Components/ModelDetail/CardModelDetail";
import Pill from "CommonUI/src/Components/Pill/Pill";
import FieldType from "CommonUI/src/Components/Types/FieldType";
import BaseAPI from "CommonUI/src/Utils/API/API";
import GlobalEvent from "CommonUI/src/Utils/GlobalEvents";
import ModelAPI, { ListResult } from "CommonUI/src/Utils/ModelAPI/ModelAPI";
import Navigation from "CommonUI/src/Utils/Navigation";
import Incident from "Model/Models/Incident";
import IncidentSeverity from "Model/Models/IncidentSeverity";
import IncidentState from "Model/Models/IncidentState";
import IncidentStateTimeline from "Model/Models/IncidentStateTimeline";
import Label from "Model/Models/Label";
import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";

const IncidentView: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID();

  const [incidentStateTimeline, setIncidentStateTimeline] = useState<
    IncidentStateTimeline[]
  >([]);
  const [incidentStates, setIncidentStates] = useState<IncidentState[]>([]);

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchData: PromiseVoidFunction = async (): Promise<void> => {
    try {
      setIsLoading(true);

      const incidentTimelines: ListResult<IncidentStateTimeline> =
        await ModelAPI.getList({
          modelType: IncidentStateTimeline,
          query: {
            incidentId: modelId,
          },
          limit: LIMIT_PER_PROJECT,
          skip: 0,
          select: {
            _id: true,
            startsAt: true,
            createdByUser: {
              name: true,
              email: true,
              profilePictureId: true,
            },
            incidentStateId: true,
          },
          sort: {
            startsAt: SortOrder.Ascending,
          },
        });

      const incidentStates: ListResult<IncidentState> = await ModelAPI.getList({
        modelType: IncidentState,
        query: {},
        limit: LIMIT_PER_PROJECT,
        skip: 0,
        select: {
          _id: true,
          name: true,
          isAcknowledgedState: true,
          isResolvedState: true,
        },
        sort: {},
      });

      setIncidentStates(incidentStates.data as IncidentState[]);
      setIncidentStateTimeline(
        incidentTimelines.data as IncidentStateTimeline[],
      );
      setError("");
    } catch (err) {
      setError(BaseAPI.getFriendlyMessage(err));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData().catch((err: Error) => {
      setError(BaseAPI.getFriendlyMessage(err));
    });
  }, []);

  if (isLoading) {
    return <PageLoader isVisible={true} />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  type GetIncidentStateFunction = () => IncidentState | undefined;

  const getAcknowledgeState: GetIncidentStateFunction = ():
    | IncidentState
    | undefined => {
    return incidentStates.find((state: IncidentState) => {
      return state.isAcknowledgedState;
    });
  };

  const getResolvedState: GetIncidentStateFunction = ():
    | IncidentState
    | undefined => {
    return incidentStates.find((state: IncidentState) => {
      return state.isResolvedState;
    });
  };

  type getTimeFunction = () => string;

  const getTimeToAcknowledge: getTimeFunction = (): string => {
    const incidentStartTime: Date =
      incidentStateTimeline[0]?.startsAt || new Date();

    const acknowledgeTime: Date | undefined = incidentStateTimeline.find(
      (timeline: IncidentStateTimeline) => {
        return (
          timeline.incidentStateId?.toString() ===
          getAcknowledgeState()?._id?.toString()
        );
      },
    )?.startsAt;

    const resolveTime: Date | undefined = incidentStateTimeline.find(
      (timeline: IncidentStateTimeline) => {
        return (
          timeline.incidentStateId?.toString() ===
          getResolvedState()?._id?.toString()
        );
      },
    )?.startsAt;

    if (!acknowledgeTime && !resolveTime) {
      return (
        "Not yet " +
        (getAcknowledgeState()?.name?.toLowerCase() || "acknowledged")
      );
    }

    if (!acknowledgeTime && resolveTime) {
      return OneUptimeDate.convertMinutesToDaysHoursAndMinutes(
        OneUptimeDate.getDifferenceInMinutes(resolveTime, incidentStartTime),
      );
    }

    return OneUptimeDate.convertMinutesToDaysHoursAndMinutes(
      OneUptimeDate.getDifferenceInMinutes(acknowledgeTime!, incidentStartTime),
    );
  };

  const getTimeToResolve: getTimeFunction = (): string => {
    const incidentStartTime: Date =
      incidentStateTimeline[0]?.startsAt || new Date();

    const resolveTime: Date | undefined = incidentStateTimeline.find(
      (timeline: IncidentStateTimeline) => {
        return (
          timeline.incidentStateId?.toString() ===
          getResolvedState()?._id?.toString()
        );
      },
    )?.startsAt;

    if (!resolveTime) {
      return (
        "Not yet " + (getResolvedState()?.name?.toLowerCase() || "resolved")
      );
    }

    return OneUptimeDate.convertMinutesToDaysHoursAndMinutes(
      OneUptimeDate.getDifferenceInMinutes(resolveTime, incidentStartTime),
    );
  };

  type GetInfoCardFunction = (value: string) => ReactElement;

  const getInfoCardValue: GetInfoCardFunction = (
    value: string,
  ): ReactElement => {
    return <div className="font-medium text-gray-900 text-lg">{value}</div>;
  };

  return (
    <Fragment>
      {/* Incident View  */}
      <CardModelDetail<Incident>
        name="Incident Details"
        cardProps={{
          title: "Incident Details",
          description: "Here are more details for this incident.",
        }}
        isEditable={true}
        formSteps={[
          {
            title: "Incident Details",
            id: "incident-details",
          },
          {
            title: "Labels",
            id: "labels",
          },
        ]}
        formFields={[
          {
            field: {
              title: true,
            },
            title: "Incident Title",
            stepId: "incident-details",
            fieldType: FormFieldSchemaType.Text,
            required: true,
            placeholder: "Incident Title",
            validation: {
              minLength: 2,
            },
          },

          {
            field: {
              incidentSeverity: true,
            },
            title: "Incident Severity",
            description: "What type of incident is this?",
            fieldType: FormFieldSchemaType.Dropdown,
            stepId: "incident-details",
            dropdownModal: {
              type: IncidentSeverity,
              labelField: "name",
              valueField: "_id",
            },
            required: true,
            placeholder: "Incident Severity",
          },
          {
            field: {
              labels: true,
            },
            title: "Labels ",
            stepId: "labels",
            description:
              "Team members with access to these labels will only be able to access this resource. This is optional and an advanced feature.",
            fieldType: FormFieldSchemaType.MultiSelectDropdown,
            dropdownModal: {
              type: Label,
              labelField: "name",
              valueField: "_id",
            },
            required: false,
            placeholder: "Labels",
          },
        ]}
        modelDetailProps={{
          onBeforeFetch: async (): Promise<JSONObject> => {
            // get ack incident.

            const incidentTimelines: ListResult<IncidentStateTimeline> =
              await ModelAPI.getList({
                modelType: IncidentStateTimeline,
                query: {
                  incidentId: modelId,
                },
                limit: LIMIT_PER_PROJECT,
                skip: 0,
                select: {
                  _id: true,

                  createdAt: true,
                  createdByUser: {
                    name: true,
                    email: true,
                    profilePictureId: true,
                  },
                  incidentState: {
                    name: true,
                    isResolvedState: true,
                    isAcknowledgedState: true,
                  },
                },
                sort: {},
              });

            return incidentTimelines;
          },
          showDetailsInNumberOfColumns: 2,
          modelType: Incident,
          id: "model-detail-incidents",
          fields: [
            {
              field: {
                _id: true,
              },
              title: "Incident ID",
              fieldType: FieldType.ObjectID,
            },
            {
              field: {
                title: true,
              },
              title: "Incident Title",
              fieldType: FieldType.Text,
            },

            {
              field: {
                currentIncidentState: {
                  color: true,
                  name: true,
                },
              },
              title: "Current State",
              fieldType: FieldType.Entity,
              getElement: (item: Incident): ReactElement => {
                if (!item["currentIncidentState"]) {
                  throw new BadDataException("Incident Status not found");
                }

                return (
                  <Pill
                    color={item.currentIncidentState.color || Black}
                    text={item.currentIncidentState.name || "Unknown"}
                  />
                );
              },
            },
            {
              field: {
                incidentSeverity: {
                  color: true,
                  name: true,
                },
              },
              title: "Incident Severity",
              fieldType: FieldType.Entity,
              getElement: (item: Incident): ReactElement => {
                if (!item["incidentSeverity"]) {
                  throw new BadDataException("Incident Severity not found");
                }

                return (
                  <Pill
                    color={item.incidentSeverity.color || Black}
                    text={item.incidentSeverity.name || "Unknown"}
                  />
                );
              },
            },
            {
              field: {
                monitors: {
                  name: true,
                  _id: true,
                },
              },
              title: "Monitors Affected",
              fieldType: FieldType.Element,
              getElement: (item: Incident): ReactElement => {
                return <MonitorsElement monitors={item["monitors"] || []} />;
              },
            },
            {
              field: {
                onCallDutyPolicies: {
                  name: true,
                  _id: true,
                },
              },
              title: "On-Call Duty Policies",
              fieldType: FieldType.Element,
              getElement: (item: Incident): ReactElement => {
                return (
                  <OnCallDutyPoliciesView
                    onCallPolicies={item.onCallDutyPolicies || []}
                  />
                );
              },
            },
            {
              field: {
                createdAt: true,
              },
              title: "Created At",
              fieldType: FieldType.DateTime,
            },
            {
              field: {
                shouldStatusPageSubscribersBeNotifiedOnIncidentCreated: true,
              },
              title: "Notify Status Page Subscribers",
              fieldType: FieldType.Boolean,
              getElement: (item: Incident): ReactElement => {
                return (
                  <div className="">
                    <CheckboxViewer
                      isChecked={
                        item[
                          "shouldStatusPageSubscribersBeNotifiedOnIncidentCreated"
                        ] as boolean
                      }
                      text={
                        item[
                          "shouldStatusPageSubscribersBeNotifiedOnIncidentCreated"
                        ]
                          ? "Subscribers Notified"
                          : "Subscribers Not Notified"
                      }
                    />{" "}
                  </div>
                );
              },
            },
            {
              field: {
                labels: {
                  name: true,
                  color: true,
                },
              },
              title: "Labels",
              fieldType: FieldType.Element,
              getElement: (item: Incident): ReactElement => {
                return <LabelsElement labels={item["labels"] || []} />;
              },
            },
            {
              field: {
                _id: true,
              },
              title: "Acknowledge Incident",
              fieldType: FieldType.Element,
              getElement: (
                _item: Incident,
                onBeforeFetchData: JSONObject | undefined,
              ): ReactElement => {
                return (
                  <ChangeIncidentState
                    incidentId={modelId}
                    incidentTimeline={
                      onBeforeFetchData
                        ? (onBeforeFetchData["data"] as Array<BaseModel>)
                        : []
                    }
                    incidentType={IncidentType.Ack}
                    onActionComplete={async () => {
                      await fetchData();
                    }}
                  />
                );
              },
            },
            {
              field: {
                _id: true,
              },
              title: "Resolve Incident",
              fieldType: FieldType.Element,
              getElement: (
                _item: Incident,
                onBeforeFetchData: JSONObject | undefined,
              ): ReactElement => {
                return (
                  <ChangeIncidentState
                    incidentId={modelId}
                    incidentTimeline={
                      onBeforeFetchData
                        ? (onBeforeFetchData["data"] as Array<BaseModel>)
                        : []
                    }
                    incidentType={IncidentType.Resolve}
                    onActionComplete={async () => {
                      GlobalEvent.dispatchEvent(
                        EventName.ACTIVE_INCIDENTS_COUNT_REFRESH,
                      );
                      await fetchData();
                    }}
                  />
                );
              },
            },
          ],
          modelId: modelId,
        }}
      />

      <div className="flex space-x-5 mt-5 mb-5 w-full justify-between">
        <InfoCard
          title={`${getAcknowledgeState()?.name || "Acknowledged"} in`}
          value={getInfoCardValue(getTimeToAcknowledge())}
          className="w-1/2"
        />
        <InfoCard
          title={`${getResolvedState()?.name || "Resolved"} in`}
          value={getInfoCardValue(getTimeToResolve())}
          className="w-1/2"
        />
      </div>

      <CardModelDetail
        name="Incident Description"
        cardProps={{
          title: "Incident Description",
          description:
            "Description of this incident. This is visible on Status Page and is in markdown format.",
        }}
        editButtonText="Edit Incident Description"
        isEditable={true}
        formFields={[
          {
            field: {
              description: true,
            },
            title: "Description",

            fieldType: FormFieldSchemaType.Markdown,
            required: true,
            placeholder: "Description",
          },
        ]}
        modelDetailProps={{
          showDetailsInNumberOfColumns: 1,
          modelType: Incident,
          id: "model-detail-incident-description",
          fields: [
            {
              field: {
                description: true,
              },
              title: "Description",
              fieldType: FieldType.Markdown,
            },
          ],
          modelId: modelId,
        }}
      />

      <CardModelDetail
        name="Root Cause"
        cardProps={{
          title: "Root Cause",
          description:
            "Why did this incident happen? Here is the root cause of this incident.",
        }}
        isEditable={false}
        modelDetailProps={{
          showDetailsInNumberOfColumns: 1,
          modelType: Incident,
          id: "model-detail-incident-root-cause",
          fields: [
            {
              field: {
                rootCause: true,
              },
              title: "",
              placeholder: "No root cause identified for this incident.",
              fieldType: FieldType.Markdown,
            },
          ],
          modelId: modelId,
        }}
      />
    </Fragment>
  );
};

export default IncidentView;
