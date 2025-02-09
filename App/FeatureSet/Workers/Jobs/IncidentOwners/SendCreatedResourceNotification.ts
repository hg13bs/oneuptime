import RunCron from "../../Utils/Cron";
import { CallRequestMessage } from "Common/Types/Call/CallRequest";
import LIMIT_MAX from "Common/Types/Database/LimitMax";
import Dictionary from "Common/Types/Dictionary";
import { EmailEnvelope } from "Common/Types/Email/EmailMessage";
import EmailTemplateType from "Common/Types/Email/EmailTemplateType";
import NotificationSettingEventType from "Common/Types/NotificationSetting/NotificationSettingEventType";
import { SMSMessage } from "Common/Types/SMS/SMS";
import { EVERY_MINUTE } from "Common/Utils/CronTime";
import IncidentService from "CommonServer/Services/IncidentService";
import ProjectService from "CommonServer/Services/ProjectService";
import UserNotificationSettingService from "CommonServer/Services/UserNotificationSettingService";
import Markdown, { MarkdownContentType } from "CommonServer/Types/Markdown";
import Incident from "Model/Models/Incident";
import Monitor from "Model/Models/Monitor";
import User from "Model/Models/User";

RunCron(
  "IncidentOwner:SendCreatedResourceEmail",
  { schedule: EVERY_MINUTE, runOnStartup: false },
  async () => {
    // get all scheduled events of all the projects.
    const incidents: Array<Incident> = await IncidentService.findBy({
      query: {
        isOwnerNotifiedOfResourceCreation: false,
      },
      props: {
        isRoot: true,
      },
      limit: LIMIT_MAX,
      skip: 0,
      select: {
        _id: true,
        title: true,
        description: true,
        projectId: true,
        project: {
          name: true,
        },
        currentIncidentState: {
          name: true,
        },
        incidentSeverity: {
          name: true,
        },
        rootCause: true,
        monitors: {
          name: true,
        },
      },
    });

    for (const incident of incidents) {
      await IncidentService.updateOneById({
        id: incident.id!,
        data: {
          isOwnerNotifiedOfResourceCreation: true,
        },
        props: {
          isRoot: true,
        },
      });

      // now find owners.

      let doesResourceHasOwners: boolean = true;

      let owners: Array<User> = await IncidentService.findOwners(incident.id!);

      if (owners.length === 0) {
        doesResourceHasOwners = false;

        // find project owners.
        owners = await ProjectService.getOwners(incident.projectId!);
      }

      if (owners.length === 0) {
        continue;
      }

      const vars: Dictionary<string> = {
        incidentTitle: incident.title!,
        projectName: incident.project!.name!,
        currentState: incident.currentIncidentState!.name!,
        incidentDescription: await Markdown.convertToHTML(
          incident.description! || "",
          MarkdownContentType.Email,
        ),
        resourcesAffected:
          incident
            .monitors!.map((monitor: Monitor) => {
              return monitor.name!;
            })
            .join(", ") || "None",
        incidentSeverity: incident.incidentSeverity!.name!,
        rootCause:
          incident.rootCause || "No root cause identified for this incident",
        incidentViewLink: (
          await IncidentService.getIncidentLinkInDashboard(
            incident.projectId!,
            incident.id!,
          )
        ).toString(),
      };

      if (doesResourceHasOwners === true) {
        vars["isOwner"] = "true";
      }

      for (const user of owners) {
        const emailMessage: EmailEnvelope = {
          templateType: EmailTemplateType.IncidentOwnerResourceCreated,
          vars: vars,
          subject: "[Incident] " + incident.title!,
        };

        const sms: SMSMessage = {
          message: `This is a message from OneUptime. New incident created: ${incident.title}. To unsubscribe from this notification go to User Settings in OneUptime Dashboard.`,
        };

        const callMessage: CallRequestMessage = {
          data: [
            {
              sayMessage: `This is a message from OneUptime. New incident created: ${incident.title}. To unsubscribe from this notification go to User Settings in OneUptime Dashboard. Good bye.`,
            },
          ],
        };

        await UserNotificationSettingService.sendUserNotification({
          userId: user.id!,
          projectId: incident.projectId!,
          emailEnvelope: emailMessage,
          smsMessage: sms,
          callRequestMessage: callMessage,
          eventType:
            NotificationSettingEventType.SEND_INCIDENT_CREATED_OWNER_NOTIFICATION,
        });
      }
    }
  },
);
